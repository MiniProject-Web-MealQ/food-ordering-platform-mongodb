import { useEffect, useReducer } from "react";
import { connectSocket } from "@/lib/socket";
import { CustomerContext, loadState, reducer, STORAGE_KEY } from "./store";

export function CustomerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    let socket;
    let disposed = false;

    connectSocket()
      .then((connected) => {
        if (disposed) {
          connected.disconnect();
          return;
        }
        socket = connected;
        socket.on("order:status", (event) => {
          if (!event?.orderNumber || !event?.status) return;
          dispatch({
            type: "order/syncStatus",
            orderId: event.orderNumber,
            status: event.status,
            at: event.changedAt,
          });
        });
      })
      .catch(() => {
        // Realtime is an enhancement; normal API flows still work without it.
      });

    return () => {
      disposed = true;
      socket?.disconnect();
    };
  }, []);

  return <CustomerContext value={{ state, dispatch }}>{children}</CustomerContext>;
}
