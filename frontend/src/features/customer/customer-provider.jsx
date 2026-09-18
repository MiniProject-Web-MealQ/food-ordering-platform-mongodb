import { useEffect, useReducer } from "react";
import { CustomerContext, loadState, reducer, STORAGE_KEY } from "./store";

export function CustomerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <CustomerContext value={{ state, dispatch }}>{children}</CustomerContext>;
}
