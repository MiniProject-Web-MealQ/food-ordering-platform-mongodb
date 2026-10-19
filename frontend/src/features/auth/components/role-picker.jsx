import { Store, UserRound } from "lucide-react";

const ROLE_COPY = {
  CUSTOMER: { label: "ลูกค้า", description: "สั่งอาหาร ดูคิว" },
  MERCHANT: { label: "ร้านค้า", description: "ขายอาหาร จัดคิว" },
};

const ROLE_ORDER = ["CUSTOMER", "MERCHANT"];

const focusRing =
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink";

/** Compact pill switch, used on the login screen. */
export function RoleSegmented({ name, legend, value, onChange }) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="auth-role-switch relative isolate grid grid-cols-2 gap-1 rounded-full bg-mint p-1.5" data-role-selected={value}>
        <span aria-hidden="true" className="auth-role-indicator pointer-events-none absolute -z-10 rounded-full bg-brand" />
        {ROLE_ORDER.map((role) => (
          <label
            key={role}
            className={`auth-role-option grid h-11 cursor-pointer place-items-center rounded-full font-semibold text-ink-soft transition-colors hover:text-ink has-checked:text-ink ${focusRing}`}
          >
            <input
              type="radio"
              name={name}
              value={role}
              checked={value === role}
              onChange={() => onChange(role)}
              className="sr-only"
            />
            <span className="flex items-center gap-2">
              {role === "MERCHANT" ? <Store aria-hidden="true" className="size-4" /> : <UserRound aria-hidden="true" className="size-4" />}
              {ROLE_COPY[role].label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Larger cards with a description, used on the registration screen. */
export function RoleCards({ name, legend, value, onChange }) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-2 gap-3">
        {ROLE_ORDER.map((role) => (
          <label
            key={role}
            className={`cursor-pointer rounded-3xl border-2 border-line bg-snow px-4 py-4 text-ink transition-colors hover:border-leaf has-checked:border-brand has-checked:bg-brand has-checked:text-ink ${focusRing}`}
          >
            <input
              type="radio"
              name={name}
              value={role}
              checked={value === role}
              onChange={() => onChange(role)}
              className="sr-only"
            />
            <span className="block font-semibold">{ROLE_COPY[role].label}</span>
            <span className="mt-0.5 block text-sm opacity-75">{ROLE_COPY[role].description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
