import { menuFromApi, menuToApi, orderFromApi, storeFromApi, storeToApi } from "./adapters";
import * as api from "./api";
import { nextStep } from "./status";
import { isSessionLost, sessionLost, useMerchant } from "./store";

/**
 * ทุกการแก้ไขส่งไป API ก่อน แล้ว store ค่อยอัปเดตตามข้อมูลที่ server ส่งกลับ
 * ทุกฟังก์ชันคืนผลจาก api-client ({ ok, data } หรือ { ok: false, error })
 * หน้าต่าง ๆ จึงแสดง error.message ได้เมื่อเรียกไม่สำเร็จ
 */
export function useMerchantActions() {
  const { dispatch } = useMerchant();

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
    /** หน้าจอตรวจรหัสรับอาหารก่อนเรียกฟังก์ชันนี้ เพราะ API ยังไม่ตรวจให้ */
    complete(order) {
      return saveOrder(api.setOrderStatus(order.order_number, "completed"));
    },
    setStoreOpen(isOpen) {
      return saveStore({ is_open: isOpen });
    },
    updateStore: saveStore,
    setMenuAvailable(menu, isAvailable) {
      return saveMenu(api.updateMenu(menu._id, { isAvailable }));
    },
    async addMenu(fields) {
      // TODO(api): POST /merchant/menu สร้างเมนูเป็น "มีขาย" เสมอ ถ้าต้องการปิดขายต้องแก้ตามหลังอีกครั้ง
      const created = await saveMenu(api.createMenu(menuToApi(fields)));
      if (!created.ok || fields.is_available) return created;
      return saveMenu(api.updateMenu(created.data.menu.id, { isAvailable: false }));
    },
    updateMenu(menuId, fields) {
      return saveMenu(api.updateMenu(menuId, menuToApi(fields)));
    },
    async removeMenu(menuId) {
      const result = await settle(api.deleteMenu(menuId));
      if (result.ok) dispatch({ type: "menu/removed", menuId });
      return result;
    },
    async logout() {
      const result = await api.logout();
      dispatch({ type: "load/signedOut" });
      return result;
    },
  };
}
