const STORAGE_KEY = "mealq.checkout.attempt";
const inputIdentity = (cart, method, ownerId) => JSON.stringify({ ownerId, items: cart.items, couponCode: cart.couponCode, couponId: cart.couponId || null, method });
const attemptFingerprint = (cart, method, total, ownerId) => JSON.stringify({ items: cart.items, couponCode: cart.couponCode, ...(cart.couponId ? { couponId: cart.couponId } : {}), method, total, ...(ownerId ? { ownerId } : {}) });

export function pendingSubmittedCheckout(ownerId) {
  if (!ownerId) return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return saved?.submitted?.ownerId === ownerId && typeof saved.key === "string" && Number.isFinite(saved.submitted.total) && saved.submitted.total >= 0
      ? { key: saved.key, total: saved.submitted.total } : null;
  } catch { return null; }
}

/** This is a retry receipt, not coupon authority: only the server may confirm payment/usage. */
export function submittedCheckout(cart, method, ownerId) {
  if (!ownerId) return null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return saved?.submitted?.identity === inputIdentity(cart, method, ownerId) && typeof saved.key === "string" && Number.isFinite(saved.submitted.total) && saved.submitted.total >= 0
      ? { key: saved.key, total: saved.submitted.total } : null;
  } catch { return null; }
}

export function checkoutAttempt(cart, method, total, ownerId) {
  const submitted = submittedCheckout(cart, method, ownerId);
  if (submitted) return submitted.key;
  // A changed basket/method must not silently discard an uncertain order and charge a second one.
  if (pendingSubmittedCheckout(ownerId)) return null;
  const fingerprint = attemptFingerprint(cart, method, total, ownerId);
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (saved?.fingerprint === fingerprint && saved.key) return saved.key;
  } catch { /* Storage is optional; the route also retains the key. */ }
  const key = globalThis.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ fingerprint, key })); } catch { /* Continue using the route key. */ }
  return key;
}
export function markCheckoutSubmitted(cart, method, total, key, ownerId) {
  if (!ownerId) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ fingerprint: attemptFingerprint(cart, method, total, ownerId), key, submitted: { ownerId, identity: inputIdentity(cart, method, ownerId), total } }));
  } catch { /* An in-memory retry still retains its original key if storage is unavailable. */ }
}
export function finishCheckout(key) {
  try { if (JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.key === key) sessionStorage.removeItem(STORAGE_KEY); } catch { /* No persisted attempt. */ }
}
