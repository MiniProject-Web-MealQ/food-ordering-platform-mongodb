import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getSession, getCapabilities } from "@/features/auth/api";
import { getJson, patchJson, postJson } from "@/lib/api-client";
import { connectSocket } from "@/lib/socket";
import { collectCoupon as collectCouponRequest, getCatalogue, getFavorites, getMyCoupons, getMyOrders, getProfile, saveFavorites, saveSettings } from "./api";
import { COUPONS, setCatalogue } from "./catalog";
import { CustomerContext, loadState, reducer, storageKey } from "./store";
import { reconcileExistingPush } from "./push-subscription";

export function CustomerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsError, setCouponsError] = useState(null);
  const [pushSyncError, setPushSyncError] = useState(null);
  const [saveErrors, setSaveErrors] = useState({});
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [capabilities, setCapabilities] = useState({ paymentMethods: ["wallet"], paymentMode: "wallet" });
  const owner = useRef(null);
  const favoritesSaved = useRef(null);
  const settingsSaved = useRef(null);
  const refreshing = useRef(false);
  const couponsRequest = useRef(0);

  useEffect(() => {
    let disposed = false;
    async function initialize() {
      const [catalogue, session, availability] = await Promise.all([getCatalogue(), getSession(), getCapabilities()]);
      if (disposed) return;
      if (!catalogue.ok) { setError(catalogue.error?.message || "โหลดร้านและเมนูไม่สำเร็จ"); return; }
      setCatalogue(catalogue.data);
      if (availability.ok) setCapabilities(availability.data);
      const user = session.ok && session.data?.user?.role === "CUSTOMER" ? session.data.user : null;
      const local = loadState(user?.id);
      const guest = user ? loadState() : null;
      if (user && local.cart.items.length === 0 && guest.cart.items.length > 0) {
        local.cart = guest.cart;
        try { localStorage.removeItem(storageKey()); } catch { /* Continue with the account cart. */ }
      }
      owner.current = user?.id || null;
      if (user) {
        const [orders, favorites, profile, coupons] = await Promise.all([getMyOrders(), getFavorites(), getProfile(), getMyCoupons()]);
        if (disposed) return;
        if (!orders.ok || !favorites.ok || !profile.ok) {
          setError((!orders.ok ? orders : !favorites.ok ? favorites : profile).error?.message || "โหลดข้อมูลบัญชีไม่สำเร็จ");
          return;
        }
        local.favorites = favorites.data.favorites;
        local.settings = { ...local.settings, ...profile.data.settings };
        local.coupons = coupons.ok ? coupons.data.coupons : [];
        setCouponsError(coupons.ok ? null : coupons.error?.message || "โหลดคูปองที่เก็บไว้ไม่สำเร็จ");
        setCouponsLoading(false);
        settingsSaved.current = JSON.stringify(local.settings);
        favoritesSaved.current = JSON.stringify(local.favorites);
        dispatch({ type: "session/load", state: local, user: profile.data.user });
        dispatch({ type: "orders/sync", orders: orders.data.orders });
        const inbox = await getJson("/customer/notifications");
        if (!disposed && inbox.ok) dispatch({ type: "notifications/sync", notifications: inbox.data.notifications });
        try {
          await reconcileExistingPush({ postJson });
          if (!disposed) setPushSyncError(null);
        } catch (error) { if (!disposed) setPushSyncError(error.message || "เชื่อมต่อแจ้งเตือนกับบัญชีนี้ไม่สำเร็จ"); }
        if (disposed) return;
      } else {
        setCouponsLoading(false);
        setCouponsError(null);
        favoritesSaved.current = null;
        settingsSaved.current = null;
        dispatch({ type: "session/load", state: local, user: null });
      }
      dispatch({ type: "catalogue/reconcile" });
      dispatch({ type: "promotions/sync", promotions: Object.values(COUPONS) });
      setError(null);
      setLoaded(true);
    }
    initialize();
    return () => { disposed = true; };
  }, [attempt]);

  const refreshCoupons = useCallback(async ({ silent = false } = {}) => {
    const expectedOwner = owner.current;
    if (!expectedOwner) return { ok: false, error: { code: "AUTH_REQUIRED", message: "กรุณาเข้าสู่ระบบก่อนเก็บคูปอง" } };
    const request = ++couponsRequest.current;
    if (!silent) setCouponsLoading(true);
    const result = await getMyCoupons();
    if (owner.current !== expectedOwner) return { ok: false, error: { code: "ACCOUNT_CHANGED", message: "บัญชีเปลี่ยนแล้ว กรุณาลองใหม่" } };
    if (request !== couponsRequest.current) return result;
    if (result.ok) dispatch({ type: "coupons/sync", coupons: result.data.coupons });
    setCouponsError(result.ok ? null : result.error?.message || "โหลดคูปองที่เก็บไว้ไม่สำเร็จ");
    setCouponsLoading(false);
    return result;
  }, []);

  const collectCoupon = useCallback(async (promotionId) => {
    const expectedOwner = owner.current;
    if (!expectedOwner) return { ok: false, error: { code: "AUTH_REQUIRED", message: "กรุณาเข้าสู่ระบบก่อนเก็บคูปอง" } };
    const result = await collectCouponRequest(promotionId);
    if (owner.current !== expectedOwner) return { ok: false, error: { code: "ACCOUNT_CHANGED", message: "บัญชีเปลี่ยนแล้ว กรุณาลองใหม่" } };
    if (result.ok) {
      dispatch({ type: "coupons/collect", coupon: result.data.coupon });
      await refreshCoupons();
    }
    return result;
  }, [refreshCoupons]);

  const retryPushSync = async () => {
    const expectedOwner = owner.current;
    if (!expectedOwner) return;
    try {
      await reconcileExistingPush({ postJson });
      if (owner.current === expectedOwner) setPushSyncError(null);
    } catch (error) { if (owner.current === expectedOwner) setPushSyncError(error.message || "เชื่อมต่อแจ้งเตือนกับบัญชีนี้ไม่สำเร็จ"); }
  };

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const catalogue = await getCatalogue();
      if (catalogue.ok) {
        setCatalogue(catalogue.data);
        dispatch({ type: "catalogue/reconcile" });
        dispatch({ type: "promotions/sync", promotions: Object.values(COUPONS) });
      }
      if (owner.current) {
        const expectedOwner = owner.current;
        const [orders, inbox] = await Promise.all([getMyOrders(), getJson("/customer/notifications"), refreshCoupons({ silent: true })]);
        if (owner.current !== expectedOwner) return;
        if (orders.ok) {
          dispatch({ type: "orders/sync", orders: orders.data.orders });
          if (inbox.ok) dispatch({ type: "notifications/sync", notifications: inbox.data.notifications });
          setSyncError(null);

        } else if (orders.status === 401 || orders.status === 403) {
          owner.current = null;
          setCouponsError(null);
          favoritesSaved.current = null;
          dispatch({ type: "session/load", state: loadState(), user: null });
        } else setSyncError(orders.error?.message || "อัปเดตสถานะไม่สำเร็จ");
      }
    } finally { refreshing.current = false; }
  }, [refreshCoupons]);

  useEffect(() => {
    if (!loaded) return;
    try {
      const { user: _user, orders: _orders, coupons: _coupons, ...persistent } = state;
      void _user; void _orders; void _coupons;
      localStorage.setItem(storageKey(state.user?.id), JSON.stringify(persistent));
    } catch { /* API data stays usable even if browser storage is full. */ }
  }, [loaded, state]);

  useEffect(() => {
    if (!loaded || !state.user || favoritesSaved.current === null) return;
    const serialized = JSON.stringify(state.favorites);
    if (serialized === favoritesSaved.current) return;
    const timer = setTimeout(async () => {
      const result = await saveFavorites(state.favorites);
      if (result.ok) { favoritesSaved.current = serialized; setSaveErrors((current) => ({ ...current, favorites: null })); }
      else setSaveErrors((current) => ({ ...current, favorites: result.error?.message || "บันทึกรายการโปรดไม่สำเร็จ" }));
    }, 300);
    return () => clearTimeout(timer);
  }, [loaded, state.user, state.favorites, saveAttempt]);

  useEffect(() => {
    if (!loaded || !state.user || settingsSaved.current === null) return;
    const serialized = JSON.stringify(state.settings);
    if (serialized === settingsSaved.current) return;
    const timer = setTimeout(async () => {
      const result = await saveSettings(state.settings);
      if (result.ok) { settingsSaved.current = serialized; setSaveErrors((current) => ({ ...current, settings: null })); }
      else setSaveErrors((current) => ({ ...current, settings: result.error?.message || "บันทึกการตั้งค่าไม่สำเร็จ" }));
    }, 300);
    return () => clearTimeout(timer);
  }, [loaded, state.user, state.settings, saveAttempt]);

  useEffect(() => {
    if (loaded && state.settings.promotions) dispatch({ type: "promotions/sync", promotions: Object.values(COUPONS) });
  }, [loaded, state.settings.promotions]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [loaded, refresh]);

  useEffect(() => {
    if (!loaded || !state.user) return;
    let socket;
    let disposed = false;
    connectSocket().then((connected) => {
      if (disposed) { connected.disconnect(); return; }
      socket = connected;
      socket.on("order:status", refresh);
      socket.on("order:created", refresh);
    }).catch(() => { /* Polling also keeps order status current. */ });
    return () => { disposed = true; socket?.disconnect(); };
  }, [loaded, state.user, refresh]);

  if (!loaded) return (
    <main className="mx-auto flex min-h-96 w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? <>
        <p role="alert" className="text-danger">{error}</p>
        <button type="button" className="rounded-full bg-brand px-6 py-3 font-semibold" onClick={() => setAttempt((value) => value + 1)}>ลองอีกครั้ง</button>
      </> : <p role="status">กำลังโหลดร้านและเมนู…</p>}
    </main>
  );

  return <CustomerContext value={{ state, dispatch, refresh, refreshCoupons, collectCoupon, couponsLoading, couponsError, capabilities, readNotification: async (id) => {
    const expectedOwner = owner.current;
    const accountChanged = () => ({ ok: false, error: { code: "ACCOUNT_CHANGED", message: "บัญชีเปลี่ยนแล้ว กรุณาโหลดการแจ้งเตือนใหม่" } });
    if (!expectedOwner || expectedOwner !== state.user?.id) return accountChanged();
    if (state.notifications.some((notice) => notice.id === id && notice.kind === "promo")) {
      dispatch({ type: "notifications/read", id });
      return { ok: true, local: true };
    }
    const result = await patchJson(`/customer/notifications/${encodeURIComponent(id)}/read`, {});
    if (owner.current !== expectedOwner) return accountChanged();
    if (result.ok) dispatch({ type: id === "all" ? "notifications/readAll" : "notifications/read", id });
    else setSyncError(result.error?.message || "บันทึกการอ่านไม่สำเร็จ");
    return result;
  } }}>
    {pushSyncError && <div role="alert" className="bg-alert/10 px-4 py-2 text-center text-sm text-danger">{pushSyncError} <button type="button" className="underline" onClick={retryPushSync}>ลองเชื่อมต่อแจ้งเตือนอีกครั้ง</button></div>}
    {(syncError || saveErrors.favorites || saveErrors.settings) && <div role="alert" className="bg-alert/10 px-4 py-2 text-center text-sm text-danger">{syncError || saveErrors.favorites || saveErrors.settings} <button type="button" className="underline" onClick={() => { setSaveAttempt((value) => value + 1); refresh(); }}>ลองอีกครั้ง</button></div>}
    {children}
  </CustomerContext>;
}
