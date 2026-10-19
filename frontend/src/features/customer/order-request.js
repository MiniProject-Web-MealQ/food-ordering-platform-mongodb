/** Keep original item inputs for idempotent replay; prices/rights remain server-authoritative. */
export function checkoutBody(cart, paymentMethod, expectedTotal) {
  return {
    items: cart.items.map((line) => ({ menuId: line.menuId, quantity: line.qty, selections: line.selections, note: line.note })),
    ...(cart.couponId ? { couponId: cart.couponId } : {}),
    ...(cart.couponCode ? { couponCode: cart.couponCode } : {}),
    paymentMethod,
    expectedTotal,
  };
}
