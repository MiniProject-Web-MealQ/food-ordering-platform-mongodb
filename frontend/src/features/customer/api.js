import { getJson, postJson, patchJson, putJson } from "@/lib/api-client";

export function createOrder({ cart, priced, paymentMethod }) {
  return postJson("/orders", {
    items: priced.lines.map((line) => ({
      menuId: line.menuId,
      quantity: line.qty,
      selections: line.selections,
      note: line.note,
    })),
    couponCode: cart.couponCode,
    paymentMethod,
  });
}

export function getMyOrders() {
  return getJson("/orders");
}

export const getCatalogue = async () => {
  const [restaurants, menus, promotions] = await Promise.all([getJson("/restaurants"), getJson("/menus"), getJson("/promotions")]);
  return !restaurants.ok ? restaurants : !menus.ok ? menus : !promotions.ok ? promotions : {
    ok: true,
    data: { restaurants: restaurants.data.restaurants, menus: menus.data.menus, promotions: promotions.data.promotions },
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
