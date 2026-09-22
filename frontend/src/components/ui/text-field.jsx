import { cx } from "@/lib/cx";

export function TextField({
  id,
  label,
  error,
  invalid,
  hint,
  hideLabel,
  trailing,
  className,
  "aria-describedby": describedBy,
  ...props
}) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedByIds =
    [describedBy, hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className={hideLabel ? "sr-only" : "block text-sm font-semibold text-ink"}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={invalid || Boolean(error) || undefined}
          aria-describedby={describedByIds}
          className={cx(
            "h-14 w-full rounded-full border-2 border-mint bg-snow px-6 text-base text-ink transition",
            "placeholder:text-ink-soft/70 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none",
            "aria-invalid:border-alert aria-invalid:focus:border-brand",
            error ? "bg-alert/10" : undefined,
            trailing ? "pr-14" : undefined,
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
      </div>
      {hint && (
        <p id={hintId} className="px-1 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="px-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
