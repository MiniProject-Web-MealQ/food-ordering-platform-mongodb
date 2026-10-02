export const USER_ROLES = ["CUSTOMER", "MERCHANT", "ADMIN"];

export function isUserRole(value) {
  return typeof value === "string" && USER_ROLES.includes(value);
}

export const ROLE_HOME = {
  CUSTOMER: "/customer",
  MERCHANT: "/merchant/dashboard",
  ADMIN: "/admin",
};

// Return only to a page in the authenticated user's portal.
export function loginDestination(role, from) {
  const home = ROLE_HOME[role];
  const prefix = role === "ADMIN" ? "/admin" : role === "MERCHANT" ? "/merchant" : "/customer";
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) return home;
  try {
    const url = new URL(from, "https://mealq.local");
    if (url.origin !== "https://mealq.local" || ["/merchant/login", "/admin/login"].includes(url.pathname)) return home;
    if (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // Invalid return paths fall back to the user's home page.
  }
  return home;
}
