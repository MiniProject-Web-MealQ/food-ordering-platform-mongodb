import { apiOrigin } from "./api-client";

/**
 * Turns the image values the API returns into URLs the browser can load.
 *
 * The backend (src/services/media.js) answers with three shapes:
 *   "/catalogue/<build>/file.jpg?v=…"        static catalogue files
 *   "/api/v1/media/<kind>/<id>/<field>?v=…"  images stored in MongoDB as data URLs
 *   "https://…" or "data:image/…"            anything stored as an absolute value
 *
 * The first two are root-relative, so they only resolve on their own when the site and the
 * API share an origin. When VITE_API_URL points at another host they are rebased onto it.
 */
export function mediaUrl(src) {
  if (typeof src !== "string") return null;
  const value = src.trim();
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (!value.startsWith("/")) return value;

  const origin = apiOrigin();
  if (!origin || origin === window.location.origin) return value;
  return `${origin}${value}`;
}
