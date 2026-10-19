import { apiUrl, getJson, postJson, UNEXPECTED_RESPONSE } from "@/lib/api-client";
import { isUserRole } from "./types";
import { normalizePhone } from "./validation";

// The role always comes from the server response; the portal/role sent by the client is only a hint.
function readAuthenticatedUser(result) {
  if (!result.ok) return result;
  const { data } = result;
  if (typeof data === "object" && data !== null && "user" in data) {
    const { user } = data;
    if (typeof user === "object" && user !== null && "role" in user && isUserRole(user.role)) {
      return { ok: true, data: { role: user.role } };
    }
  }
  return { ok: false, error: UNEXPECTED_RESPONSE };
}

export async function login(input) {
  return readAuthenticatedUser(
    await postJson("/auth/login", { ...input, email: input.email.trim() }),
  );
}

export const getSession = () => getJson("/auth/me");
export const getCapabilities = () => getJson("/auth/capabilities");

export async function register(input) {
  const phone = normalizePhone(input.phone);
  return readAuthenticatedUser(
    await postJson("/auth/register", {
      role: input.role,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: phone || null,
      password: input.password,
    }),
  );
}

export async function requestPasswordReset(email) {
  return postJson("/auth/forgot-password", { email: email.trim() });
}

export async function resetPassword(token, password) {
  return postJson("/auth/reset-password", { token, password });
}

export function googleSignInUrl(portal) {
  const params = new URLSearchParams({ portal: portal.toLowerCase(), returnOrigin: window.location.origin });
  return apiUrl(`/auth/google?${params}`);
}
