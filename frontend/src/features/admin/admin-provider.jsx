import { useEffect, useReducer } from "react";
import { AdminContext, loadState, reducer, saveState } from "./store";

export function AdminProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return <AdminContext value={{ state, dispatch }}>{children}</AdminContext>;
}
