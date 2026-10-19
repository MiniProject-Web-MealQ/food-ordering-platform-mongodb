import { useCallback, useEffect, useState } from "react";
import { getJson, requestJson } from "@/lib/api-client";
import { AdminContext, emptyAdminState } from "./store";

function requestFor(action) {
  switch (action.type) {
    case "session/logout": return ["/auth/logout", "POST", {}];
    case "store/setStatus": return [`/admin/stores/${action.storeId}`, "PATCH", { status: action.status, reason: action.reason }];
    case "store/forceClose": return [`/admin/stores/${action.storeId}`, "PATCH", { is_open: false, reason: action.reason }];
    case "store/update": return [`/admin/stores/${action.storeId}`, "PATCH", { address: action.address, maxQueue: action.maxQueue }];
    case "user/setStatus": return [`/admin/users/${action.userId}`, "PATCH", { status: action.status, reason: action.reason }];
    case "user/setRole": return [`/admin/users/${action.userId}`, "PATCH", { role: action.role, ...(action.storeId ? { storeId: action.storeId } : {}) }];
    case "user/addAdmin": return ["/admin/users", "POST", action.user];
    case "user/changePassword": return ["/auth/password", "PATCH", { currentPassword: action.currentPassword, newPassword: action.password }];
    case "order/cancel": return [`/admin/orders/${action.orderId}/cancel`, "POST", { reason: action.reason }];
    case "promotion/add": return ["/admin/promotions", "POST", action.promotion];
    case "promotion/update": return [`/admin/promotions/${action.promotionId}`, "PATCH", action.changes];
    case "wallet/adjust": return [`/admin/wallets/${action.userId}/adjust`, "POST", { amount: action.amount, reason: action.reason, key: action.key }];
    default: return null;
  }
}

export function AdminProvider({ children }) {
  const [state, setState] = useState(emptyAdminState);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const result = await getJson("/admin/state");
    if (result.ok && result.data?.session) {
      setState(result.data);
      setError("");
    } else if (result.status === 401 || result.status === 403) {
      setState(emptyAdminState());
      setError("");
    } else {
      setError(result.error?.message || "โหลดข้อมูลผู้ดูแลไม่สำเร็จ");
    }
    setLoading(false);
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    const update = async () => { if (active) await refresh(); };
    update();
    const timer = window.setInterval(update, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [refresh]);

  const dispatch = useCallback(async (action) => {
    const request = requestFor(action);
    if (!request) {
      setError("ฟังก์ชันนี้ยังไม่พร้อมใช้งาน");
      return { ok: false };
    }
    setBusy(true);
    setError("");
    try {
      const [path, method, body] = request;
      const result = await requestJson(path, { method, body });
      if (!result.ok) {
        setError(result.error?.message || "บันทึกไม่สำเร็จ");
        return result;
      }
      if (action.type === "session/logout") setState(emptyAdminState());
      else await refresh();
      return result;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return <AdminContext value={{ state, dispatch, loading, busy, error, refresh }}>{children}</AdminContext>;
}
