import { getJson, postJson, patchJson, putJson, requestJson } from "@/lib/api-client";
import { checkoutBody } from "./order-request";

export function createOrder({ cart, priced, paymentMethod, requestKey }) {
  return requestJson("/orders", { method: "POST", headers: { "Idempotency-Key": requestKey }, body: checkoutBody(cart, paymentMethod, priced.total) });
}

export function checkOrderStock({ cart, paymentMethod }) {
  return postJson("/orders/check-stock", checkoutBody(cart, paymentMethod));
}

export const getWallet = () => getJson("/customer/wallet");
export const getMyCoupons = () => getJson("/customer/coupons");
export const collectCoupon = (promotionId) => postJson(`/customer/coupons/${encodeURIComponent(promotionId)}/collect`, {});
export const topupWallet = (amount, key) => requestJson("/customer/wallet/topup", { method: "POST", headers: { "Idempotency-Key": key }, body: { amount } });

export function getMyOrders() {
  return getJson("/orders");
}

export const getCatalogue = async () => {
  const [restaurants, menus, promotions, config] = await Promise.all([getJson("/restaurants"), getJson("/menus"), getJson("/promotions"), getJson("/config")]);
  return !restaurants.ok ? restaurants : !menus.ok ? menus : !promotions.ok ? promotions : !config.ok ? config : {
    ok: true,
    data: { restaurants: restaurants.data.restaurants, menus: menus.data.menus, promotions: promotions.data.promotions, config: config.data },
  };
};
export const getProfile = () => getJson("/customer/profile");
export const saveProfile = (input) => patchJson("/customer/profile", input);
export const saveSettings = (settings) => patchJson("/customer/settings", settings);
export const getFavorites = () => getJson("/customer/favorites");
export const saveFavorites = (favorites) => putJson("/customer/favorites", { favorites });
export const getRestaurantReviews = (id) => getJson(`/restaurants/${encodeURIComponent(id)}/reviews`);
export const submitReview = (id, review) => postJson(`/orders/${encodeURIComponent(id)}/review`, review);
export const cancelOrder = (id) => patchJson(`/orders/${encodeURIComponent(id)}/cancel`, {});
