function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && !/[<>,;:\[\]"]/.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validPassword(value) {
  return typeof value === "string" && value.length >= 8 && value.length <= 128 && /\p{L}/u.test(value) && /\d/.test(value);
}

function normalizeRole(value, allowAdmin = false) {
  if (value === undefined || value === null || value === "") return "customer";
  if (typeof value !== "string") return null;
  const role = value.toLowerCase();
  return ["customer", "merchant", ...(allowAdmin ? ["admin"] : [])].includes(role) ? role : null;
}

module.exports = { validEmail, validPassword, normalizeRole };
