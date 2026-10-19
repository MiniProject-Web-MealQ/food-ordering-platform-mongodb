import { useCallback, useEffect, useRef, useState } from "react";
import { requestJson } from "@/lib/api-client";
import { createInventoryRefresh, loadInventoryCatalogue } from "./inventory-state";

export function useInventoryCatalogue({ includeMenus = false, watchKey, pollMs = 0 } = {}) {
  const loader = useRef(null);
  const [snapshot, setSnapshot] = useState({ ingredients: [], menus: [], loading: true, refreshing: false, error: "", updatedAt: null });
  useEffect(() => {
    const current = createInventoryRefresh({
      load: (signal) => loadInventoryCatalogue(requestJson, { includeMenus, signal }),
      onPending: (refreshing) => setSnapshot((previous) => ({ ...previous, refreshing })),
      onSuccess: (data) => setSnapshot((previous) => ({ ...previous, ...data, loading: false, error: "", updatedAt: Date.now() })),
      onError: (error) => setSnapshot((previous) => ({ ...previous, loading: false, error: error.message || "โหลดสต็อกไม่สำเร็จ" })),
    });
    loader.current = current;
    const refreshVisible = () => { if (!document.hidden) current.refresh(); };
    current.refresh();
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    const timer = pollMs > 0 ? setInterval(refreshVisible, pollMs) : null;
    return () => {
      current.dispose();
      if (loader.current === current) loader.current = null;
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      if (timer !== null) clearInterval(timer);
    };
  }, [includeMenus, pollMs]);
  useEffect(() => { loader.current?.refresh(); }, [watchKey]);
  const refresh = useCallback(() => loader.current?.refresh() || Promise.resolve(false), []);
  return { ...snapshot, refresh };
}
