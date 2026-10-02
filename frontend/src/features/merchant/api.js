import { deleteJson, getJson, patchJson, postJson } from "@/lib/api-client";

export const getDashboard = () => getJson("/merchant/dashboard");
export const getOrders = () => getJson("/merchant/orders");
export const getOrder = (id) => getJson(`/merchant/orders/${encodeURIComponent(id)}`);
export const setOrderStatus = (id, status) =>
  patchJson(`/merchant/orders/${encodeURIComponent(id)}/status`, { status });
export const receiveOrder = (id, receiveCode) =>
  postJson(`/merchant/orders/${encodeURIComponent(id)}/receive`, { receiveCode });

export const getMenus = () => getJson("/merchant/menu");
export const getMenu = (id) => getJson(`/merchant/menu/${encodeURIComponent(id)}`);
export const createMenu = (input) => postJson("/merchant/menu", input);
export const updateMenu = (id, input) => patchJson(`/merchant/menu/${encodeURIComponent(id)}`, input);
export const deleteMenu = (id) => deleteJson(`/merchant/menu/${encodeURIComponent(id)}`);

export const getStore = () => getJson("/merchant/store");
export const updateStore = (input) => patchJson("/merchant/store", input);

export const getSession = () => getJson("/auth/me");
export const logout = () => postJson("/auth/logout", {});
