import { useEffect, useRef, useState } from "react";
import { requestJson } from "@/lib/api-client";
import { EMPTY_PUBLIC_CATALOGUE, loadPublicCatalogue } from "./public-catalogue.js";

export function usePublicCatalogue() {
  const [state, setState] = useState({ catalogue: EMPTY_PUBLIC_CATALOGUE, status: "loading", refreshing: false, lastUpdated: null });
  const refreshRef = useRef(null);
  useEffect(() => {
    let active = true;
    let pending = false;
    let controller;
    let hasSnapshot = false;
    async function refresh() {
      if (!active || pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      setState((previous) => ({ ...previous, refreshing: true }));
      const result = await loadPublicCatalogue(requestJson, controller.signal);
      clearTimeout(timeout);
      pending = false;
      if (!active) return;
      if (result.ok) {
        hasSnapshot = true;
        setState({ catalogue: result.catalogue, status: "ready", refreshing: false, lastUpdated: Date.now() });
      } else {
        setState((previous) => ({ ...previous, status: hasSnapshot ? "stale" : "error", refreshing: false }));
      }
    }
    function refreshVisible() {
      if (document.visibilityState !== "hidden") void refresh();
    }
    refreshRef.current = refresh;
    void refresh();
    const interval = setInterval(refreshVisible, 30000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      refreshRef.current = null;
    };
  }, []);
  return { ...state, retry: () => refreshRef.current?.() };
}
