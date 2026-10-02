import { Search } from "lucide-react";
import { fieldClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";

/** แถวตัวกรองเหนือตาราง: มือถือเรียงลง จอใหญ่เรียงเป็นแถวเดียว */
export function FilterRow({ children }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">{children}</div>;
}

export function SearchField({ id, label, value, onChange, placeholder }) {
  return (
    <div className="relative sm:col-span-2 lg:w-80">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(fieldClass, "h-12 rounded-full py-0 pl-12")}
      />
    </div>
  );
}

/** options: [{ value, label }] */
export function SelectField({ id, label, value, onChange, options, className }) {
  return (
    <div className={cx("space-y-1", className)}>
      <label htmlFor={id} className="block text-xs font-semibold text-ink-soft">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(fieldClass, "h-12 rounded-full py-0 lg:w-48")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DateField({ id, label, value, onChange }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-ink-soft">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(fieldClass, "h-12 rounded-full py-0 lg:w-44")}
      />
    </div>
  );
}
