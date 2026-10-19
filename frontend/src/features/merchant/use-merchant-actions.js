import { menuFromApi, menuToApi, menuUpdateToApi, orderFromApi, storeFromApi, storeToApi } from "./adapters";
import * as api from "./api";
import { nextStep } from "./status";
import { isSessionLost, sessionLost, useMerchant } from "./store";
import { postJson } from "@/lib/api-client";
import { logoutWithPushCleanup } from "@/features/customer/push-subscription";

/**
 * ทุกการแก้ไขส่งไป API ก่อน แล้ว store ค่อยอัปเดตตามข้อมูลที่ server ส่งกลับ
 * ทุกฟังก์ชันคืนผลจาก api-client ({ ok, data } หรือ { ok: false, error })
 * หน้าต่าง ๆ จึงแสดง error.message ได้เมื่อเรียกไม่สำเร็จ
 */
export function useMerchantActions() {
  const { state, dispatch, loggingOut, setLoggingOut, setNotificationError } = useMerchant();

  /** รอผลการเรียก API ถ้า session ร้านหลุดไปแล้ว ให้กลับไปหน้า login */
  async function settle(request) {
    const result = await request;
    if (isSessionLost(result)) dispatch(sessionLost);
    return result;
  }

  async function saveOrder(request) {
    const result = await settle(request);
    if (result.ok) dispatch({ type: "order/saved", ...orderFromApi(result.data.order) });
    return result;
  }

  async function saveStore(changes) {
    const result = await settle(api.updateStore(storeToApi(changes)));
    if (result.ok) dispatch({ type: "store/saved", store: storeFromApi(result.data.store) });
    return result;
  }

  async function saveMenu(request) {
    const result = await settle(request);
    if (result.ok) dispatch({ type: "menu/saved", menu: menuFromApi(result.data.menu) });
    return result;
  }

  return {
    advance(order) {
      const step = nextStep(order.status);
      return saveOrder(api.setOrderStatus(order.order_number, step.status));
    },
    cancel(order) {
      return saveOrder(api.setOrderStatus(order.order_number, "cancelled"));
    },
    /** Backend เป็นคนตรวจรหัสรับอาหารและปิดออเดอร์ เพื่อไม่ให้ข้ามการยืนยันจากฝั่ง client */
    complete(order, receiveCode) {
      return saveOrder(api.receiveOrder(order.order_number, receiveCode));
    },
    setStoreOpen(isOpen) {
      return saveStore({ is_open: isOpen });
    },
    updateStore: saveStore,
    setMenuAvailable(menu, isAvailable) {
      return saveMenu(api.updateMenu(menu._id, { isAvailable }));
    },
    addMenu(fields) {
      return saveMenu(api.createMenu(menuToApi(fields)));
    },
    updateMenu(menuId, fields) {
      const currentMenu = state.menus.find((menu) => menu._id === menuId);
      return saveMenu(api.updateMenu(menuId, menuUpdateToApi(fields, currentMenu)));
    },
    async removeMenu(menuId) {
      const result = await settle(api.deleteMenu(menuId));
      if (result.ok) dispatch({ type: "menu/removed", menuId });
      return result;
    },
    async logout() {
      if (loggingOut) return { ok: false };
      setLoggingOut(true); setNotificationError("");
      try {
        if (state.session?.accountRole === "merchant") await logoutWithPushCleanup({ postJson, prefix: "/merchant" });
        else { const result = await api.logout(); if (!result.ok) throw new Error(result.error?.message || "ออกจากระบบไม่สำเร็จ"); }
        dispatch({ type: "load/signedOut" });
        return { ok: true };
      } catch (error) {
        setNotificationError(error.message || "ปิดแจ้งเตือนก่อนออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
        return { ok: false, error: { message: error.message } };
      } finally { setLoggingOut(false); }
    },
  };
}
