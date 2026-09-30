import { useEffect, useReducer } from "react";
import { loadState, MerchantContext, reducer, saveState } from "./store";

export function MerchantProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return <MerchantContext value={{ state, dispatch }}>{children}</MerchantContext>;
}
