import { getJson, postJson } from "@/lib/api-client";

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
