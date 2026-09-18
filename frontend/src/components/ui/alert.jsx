import { cx } from "@/lib/cx";

export function Alert({ tone, title, children }) {
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cx(
        "flex gap-3 rounded-3xl border-2 px-5 py-4",
        isError ? "border-alert bg-alert/10" : "border-leaf bg-mint/60",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-sm font-bold",
          isError ? "bg-alert text-white" : "bg-leaf text-ink",
        )}
      >
        {isError ? "!" : "✓"}
      </span>
      <div className="space-y-0.5">
        <p className={cx("font-semibold", isError ? "text-danger" : "text-ink")}>{title}</p>
        {children && <div className="text-sm text-muted">{children}</div>}
      </div>
    </div>
  );
}
