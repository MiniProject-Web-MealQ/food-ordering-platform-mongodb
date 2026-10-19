/** Notification/email links use the database ID; the order list uses its number. */
export function findCustomerOrder(orders, reference) {
  if (!Array.isArray(orders) || typeof reference !== "string" || !reference) return null;
  return orders.find((order) => order && (order.id === reference || order.backendOrderId === reference)) || null;
}
