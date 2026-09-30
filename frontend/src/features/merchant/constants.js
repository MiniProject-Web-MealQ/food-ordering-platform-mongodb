/**
 * Menu category codes. They must match MENU_CATEGORIES in features/customer/mock-data.js
 * and the values the backend seed stores, because the customer app groups menus by these codes.
 */
export const MENU_CATEGORIES = [
  { value: "single", label: "อาหารจานเดียว" },
  { value: "noodle", label: "เส้น" },
  { value: "drink", label: "เครื่องดื่ม" },
  { value: "dessert", label: "ของหวาน" },
];

/** Thai label for a category code; unknown codes (made outside this app) show as-is. */
export function categoryLabel(code) {
  return MENU_CATEGORIES.find((c) => c.value === code)?.label ?? code;
}

export const PAYMENT_METHOD_LABEL = {
  promptpay: "PromptPay",
  card: "บัตรเครดิต/เดบิต",
  banking: "Online banking",
  wallet: "MealQ Wallet",
};

/** Account created by `npm run seed` in backend/. Shown on the login page in dev builds only. */
export const SEED_MERCHANT = { email: "merchant@mealq.local", password: "Merchant123!" };
