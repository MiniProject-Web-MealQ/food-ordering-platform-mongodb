import { createContext, use } from "react";

export const AdminContext = createContext(null);
export const emptyAdminState = () => ({ session: null, users: [], stores: [], menus: [], orders: [], promotions: [], wallets: [], wallet_transactions: [], activity: [], settings: null });

export function useAdmin() {
  const context = use(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside <AdminProvider>");
  return context;
}

const uid = () => crypto.randomUUID();
export const actions = {
  setStoreStatus: (storeId, status, reason) => ({ type: "store/setStatus", storeId, status, reason }),
  forceCloseStore: (storeId, reason) => ({ type: "store/forceClose", storeId, reason }),
  updateStore: (storeId, address, maxQueue) => ({ type: "store/update", storeId, address, maxQueue }),
  setUserStatus: (userId, status, reason) => ({ type: "user/setStatus", userId, status, reason }),
  setUserRole: (userId, role) => ({ type: "user/setRole", userId, role }),
  changePassword: (userId, password, currentPassword) => ({ type: "user/changePassword", userId, password, currentPassword }),
  addAdmin: (user) => ({ type: "user/addAdmin", user }),
  cancelOrder: (orderId, reason) => ({ type: "order/cancel", orderId, reason }),
  addPromotion: (fields) => ({ type: "promotion/add", promotion: fields }),
  updatePromotion: (promotionId, changes) => ({ type: "promotion/update", promotionId, changes }),
  adjustWallet: (userId, amount, reason, key = uid()) => ({ type: "wallet/adjust", userId, amount, reason, key }),
};
