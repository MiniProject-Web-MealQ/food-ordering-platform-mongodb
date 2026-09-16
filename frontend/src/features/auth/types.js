export const USER_ROLES = ["CUSTOMER", "MERCHANT"];

export function isUserRole(value) {
  return typeof value === "string" && USER_ROLES.includes(value);
}

export const ROLE_HOME = {
  CUSTOMER: "/restaurants",
  MERCHANT: "/merchant",
};
