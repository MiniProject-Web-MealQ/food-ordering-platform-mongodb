import { cx } from "@/lib/cx";

export function ToggleSwitch({ id, label, checked, onChange, tone = "light" }) {
  return (
    <label htmlFor={id} className="flex min-w-0 cursor-pointer items-center justify-between gap-4">
      <span className={cx("min-w-0 font-semibold wrap-anywhere", tone === "dark" ? "text-white" : "text-ink")}>{label}</span>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={cx(
            "peer h-8 w-14 cursor-pointer appearance-none rounded-full transition-colors checked:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2",
            tone === "dark" ? "bg-white/20 focus-visible:outline-white" : "bg-haze focus-visible:outline-ink",
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6"
        />
      </span>
    </label>
  );
}
