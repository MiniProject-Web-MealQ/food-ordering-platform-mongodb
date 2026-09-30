import { menuFromApi, menuToApi, orderFromApi, storeFromApi, storeToApi } from "./adapters";
import * as api from "./api";
import { nextStep } from "./status";
import { isSessionLost, sessionLost, useMerchant } from "./store";

/**
 * Every change goes to the API first; the store only updates with what the server sent back.
 * Each function resolves to the api-client result ({ ok, data } or { ok: false, error }),
 * so pages can show error.message when a request fails.
 */
export function useMerchantActions() {
  const { dispatch } = useMerchant();

  /** Waits for a request; if the merchant session is gone, sends the app back to the login page. */
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
    /** The receive code is checked by the page first: the API does not verify it yet. */
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
      // TODO(api): POST /merchant/menu always creates the menu as available; turn it off afterwards if asked.
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
