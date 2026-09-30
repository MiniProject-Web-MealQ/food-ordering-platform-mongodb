import { cx } from "@/lib/cx";

export function StatCard({ label, value, hint, Icon, highlight = false }) {
  return (
    <div className={cx("rounded-3xl p-4 ring-1 sm:p-5", highlight ? "bg-cocoa text-white ring-cocoa" : "bg-white ring-haze")}>
      <div className="flex items-center justify-between gap-2">
        <p className={cx("text-sm font-semibold", highlight ? "text-white/85" : "text-ink-soft")}>{label}</p>
        {Icon && (
          <span
            aria-hidden="true"
            className={cx(
              "grid size-9 shrink-0 place-items-center rounded-full",
              highlight ? "bg-white/15 text-white" : "bg-mint text-cocoa",
            )}
          >
            <Icon className="size-5" />
          </span>
        )}
      </div>
      <p className={cx("mt-2 text-3xl font-bold sm:text-4xl", highlight ? "text-white" : "text-ink")}>{value}</p>
      {hint && <p className={cx("mt-1 text-xs", highlight ? "text-white/80" : "text-ink-soft")}>{hint}</p>}
    </div>
  );
}
