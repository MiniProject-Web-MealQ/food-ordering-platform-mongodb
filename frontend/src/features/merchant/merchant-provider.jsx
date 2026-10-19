import { useCallback, useEffect, useReducer, useState } from "react";
import { connectSocket } from "@/lib/socket";
import { initialState, loadEverything, loadOrders, loadStore, MerchantContext, reducer } from "./store";
import { postJson } from "@/lib/api-client";
import { reconcileExistingPush } from "@/features/customer/push-subscription";

/** ดึงออเดอร์ซ้ำทุกช่วงเวลานี้ แม้ socket จะเงียบ เผื่อ socket หลุด */
const POLL_MS = 30000;

export function MerchantProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loadCount, setLoadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const signedIn = state.status === "ready";

  useEffect(() => {
    let active = true;
    loadEverything().then(async (action) => {
      if (active && action.type === "load/succeeded" && action.session.accountRole === "merchant") {
        try { await reconcileExistingPush({ postJson, prefix: "/merchant" }); if (active) setNotificationError(""); }
        catch (error) { if (active) setNotificationError(error.message || "เชื่อมต่อแจ้งเตือนร้านไม่สำเร็จ"); }
      }
      if (active) dispatch(action);
    });
    return () => {
      active = false;
    };
  }, [loadCount]);

  const reload = useCallback(() => {
    dispatch({ type: "load/started" });
    setLoadCount((count) => count + 1);
  }, []);

  // อัปเดตแบบ realtime: backend ส่ง "order:new" และ "order:status" มาที่ห้อง socket ของร้านนี้
  useEffect(() => {
    if (!signedIn) return undefined;
    let active = true;
    let socket;

    const refresh = () =>
      Promise.all([loadOrders(), loadStore()]).then((actions) => {
        if (active) actions.filter(Boolean).forEach(dispatch);
      });

    connectSocket()
      .then((connected) => {
        if (!active) {
          connected.disconnect();
          return;
        }
        socket = connected;
        // ดึงออเดอร์ที่อาจเข้ามาก่อน (หรือระหว่าง) ที่ socket กำลังเชื่อมต่อ
        socket.on("connect", refresh);
        if (socket.connected) refresh();
        socket.on("order:new", refresh);
        socket.on("order:status", refresh);
      })
      .catch(() => {
        // ถึงไม่มี realtime การดึงซ้ำด้านล่างก็ยังทำให้กระดานเป็นข้อมูลล่าสุด
      });

    const timer = setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      socket?.disconnect();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [signedIn]);

  async function retryNotifications() {
    if (state.session?.accountRole !== "merchant") return;
    try { await reconcileExistingPush({ postJson, prefix: "/merchant" }); setNotificationError(""); }
    catch (error) { setNotificationError(error.message || "เชื่อมต่อแจ้งเตือนร้านไม่สำเร็จ"); }
  }
  return <MerchantContext value={{ state, dispatch, reload, notificationError, setNotificationError, loggingOut, setLoggingOut }}>
    {notificationError && signedIn && <div role="alert" className="bg-alert/10 px-4 py-2 text-center text-sm text-danger">{notificationError} <button type="button" className="underline" onClick={retryNotifications}>ลองเชื่อมต่อแจ้งเตือนอีกครั้ง</button></div>}
    {children}
  </MerchantContext>;
}
