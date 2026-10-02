import { useCallback, useEffect, useReducer, useState } from "react";
import { connectSocket } from "@/lib/socket";
import { initialState, loadEverything, loadOrders, MerchantContext, reducer } from "./store";

/** ดึงออเดอร์ซ้ำทุกช่วงเวลานี้ แม้ socket จะเงียบ เผื่อ socket หลุด */
const POLL_MS = 30000;

export function MerchantProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loadCount, setLoadCount] = useState(0);
  const signedIn = state.status === "ready";

  useEffect(() => {
    let active = true;
    loadEverything().then((action) => {
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
      loadOrders().then((action) => {
        if (active && action) dispatch(action);
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

  return <MerchantContext value={{ state, dispatch, reload }}>{children}</MerchantContext>;
}
