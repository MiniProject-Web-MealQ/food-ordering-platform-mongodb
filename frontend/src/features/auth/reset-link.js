/**
 * The reset email links to /reset-password?token=…&expires=<unix ms>.
 * `expires` only drives the on-screen countdown; the server validates the token and its expiry.
 */
export function parseExpiresParam(value) {
  if (!value || !/^\d+$/.test(value)) return null;
  const expiresAt = Number(value);
  return Number.isSafeInteger(expiresAt) ? expiresAt : null;
}

/** 872_000 → "14:32" */
export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
