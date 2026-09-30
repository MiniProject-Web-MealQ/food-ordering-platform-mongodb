import { useCallback, useEffect, useReducer, useState } from "react";
import { connectSocket } from "@/lib/socket";
import { initialState, loadEverything, loadOrders, MerchantContext, reducer } from "./store";

/** Re-read orders this often even when the socket is quiet, in case it dropped. */
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

  // Live updates: the backend emits "order:new" and "order:status" to this store's socket room.
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
        // Catch up on anything that arrived before (or while) the socket was connecting.
        socket.on("connect", refresh);
        if (socket.connected) refresh();
        socket.on("order:new", refresh);
        socket.on("order:status", refresh);
      })
      .catch(() => {
        // Polling below still keeps the board current without realtime.
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
