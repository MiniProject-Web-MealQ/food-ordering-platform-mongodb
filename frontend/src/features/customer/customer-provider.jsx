import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { getSession } from "@/features/auth/api";
import { connectSocket } from "@/lib/socket";
import { getCatalogue, getFavorites, getMyOrders, getProfile, saveFavorites, saveSettings } from "./api";
import { setCatalogue } from "./catalog";
import { CustomerContext, loadState, reducer, storageKey } from "./store";

export function CustomerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const owner = useRef(null);
  const favoritesSaved = useRef(null);
  const settingsSaved = useRef(null);
  const refreshing = useRef(false);

  useEffect(() => {
    let disposed = false;
    async function initialize() {
      const [catalogue, session] = await Promise.all([getCatalogue(), getSession()]);
      if (disposed) return;
      if (!catalogue.ok) { setError(catalogue.error?.message || "โหลดร้านและเมนูไม่สำเร็จ"); return; }
      setCatalogue(catalogue.data);
      const user = session.ok && session.data?.user?.role === "CUSTOMER" ? session.data.user : null;
      const local = loadState(user?.id);
      const guest = user ? loadState() : null;
      if (user && local.cart.items.length === 0 && guest.cart.items.length > 0) {
        local.cart = guest.cart;
        try { localStorage.removeItem(storageKey()); } catch { /* Continue with the account cart. */ }
      }
      owner.current = user?.id || null;
      if (user) {
        const [orders, favorites, profile] = await Promise.all([getMyOrders(), getFavorites(), getProfile()]);
        if (disposed) return;
        if (!orders.ok || !favorites.ok || !profile.ok) {
          setError((!orders.ok ? orders : !favorites.ok ? favorites : profile).error?.message || "โหลดข้อมูลบัญชีไม่สำเร็จ");
          return;
        }
        local.favorites = favorites.data.favorites;
        local.settings = { ...local.settings, ...profile.data.settings };
        settingsSaved.current = JSON.stringify(local.settings);
        favoritesSaved.current = JSON.stringify(local.favorites);
        dispatch({ type: "session/load", state: local, user: profile.data.user });
        dispatch({ type: "orders/sync", orders: orders.data.orders });
      } else {
        favoritesSaved.current = null;
        settingsSaved.current = null;
        dispatch({ type: "session/load", state: local, user: null });
      }
      dispatch({ type: "catalogue/reconcile" });
      setError(null);
      setLoaded(true);
    }
    initialize();
    return () => { disposed = true; };
  }, [attempt]);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const catalogue = await getCatalogue();
      if (catalogue.ok) {
        setCatalogue(catalogue.data);
        dispatch({ type: "catalogue/reconcile" });
      }
      if (owner.current) {
        const expectedOwner = owner.current;
        const orders = await getMyOrders();
        if (owner.current !== expectedOwner) return;
        if (orders.ok) {
          dispatch({ type: "orders/sync", orders: orders.data.orders });
          setSyncError(null);
        } else if (orders.status === 401 || orders.status === 403) {
          owner.current = null;
          favoritesSaved.current = null;
          dispatch({ type: "session/load", state: loadState(), user: null });
        } else setSyncError(orders.error?.message || "อัปเดตสถานะไม่สำเร็จ");
      }
    } finally { refreshing.current = false; }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      const { user: _user, orders: _orders, ...persistent } = state;
      void _user; void _orders;
      localStorage.setItem(storageKey(state.user?.id), JSON.stringify(persistent));
    } catch { /* API data stays usable even if browser storage is full. */ }
  }, [loaded, state]);

  useEffect(() => {
    if (!loaded || !state.user || favoritesSaved.current === null) return;
    const serialized = JSON.stringify(state.favorites);
    if (serialized === favoritesSaved.current) return;
    const timer = setTimeout(async () => {
      const result = await saveFavorites(state.favorites);
      if (result.ok) { favoritesSaved.current = serialized; setSyncError(null); }
      else setSyncError(result.error?.message || "บันทึกรายการโปรดไม่สำเร็จ");
    }, 300);
    return () => clearTimeout(timer);
  }, [loaded, state.user, state.favorites]);

  useEffect(() => {
    if (!loaded || !state.user || settingsSaved.current === null) return;
    const serialized = JSON.stringify(state.settings);
    if (serialized === settingsSaved.current) return;
    const timer = setTimeout(async () => {
      const result = await saveSettings(state.settings);
      if (result.ok) { settingsSaved.current = serialized; setSyncError(null); }
      else setSyncError(result.error?.message || "บันทึกการตั้งค่าไม่สำเร็จ");
    }, 300);
    return () => clearTimeout(timer);
  }, [loaded, state.user, state.settings]);

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

  return <CustomerContext value={{ state, dispatch, refresh }}>
    {syncError && <div role="alert" className="bg-alert/10 px-4 py-2 text-center text-sm text-danger">{syncError} <button type="button" className="underline" onClick={refresh}>ลองอีกครั้ง</button></div>}
    {children}
  </CustomerContext>;
}
