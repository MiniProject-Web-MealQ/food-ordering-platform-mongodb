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
      <div className="grid grid-cols-2 gap-1 rounded-full bg-butter p-1.5">
        {ROLE_ORDER.map((role) => (
          <label
            key={role}
            className={`grid h-11 cursor-pointer place-items-center rounded-full font-semibold text-muted transition-colors hover:text-ink has-checked:bg-apricot has-checked:text-ink ${focusRing}`}
          >
            <input
              type="radio"
              name={name}
              value={role}
              checked={value === role}
              onChange={() => onChange(role)}
              className="sr-only"
            />
            {ROLE_COPY[role].label}
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
            className={`cursor-pointer rounded-3xl border-2 border-butter bg-linen px-4 py-4 text-ink transition-colors hover:border-honey has-checked:border-apricot has-checked:bg-apricot ${focusRing}`}
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
            <span className="mt-0.5 block text-sm text-ink/75">{ROLE_COPY[role].description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
