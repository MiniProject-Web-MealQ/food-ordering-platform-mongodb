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
            "h-14 w-full rounded-full border-2 border-butter bg-linen px-6 text-base text-ink transition",
            "placeholder:text-muted/70 focus:border-apricot focus:ring-1 focus:ring-apricot focus:outline-none",
            "aria-invalid:border-coral aria-invalid:focus:border-apricot",
            error ? "bg-coral/10" : undefined,
            trailing ? "pr-14" : undefined,
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
      </div>
      {hint && (
        <p id={hintId} className="px-1 text-sm text-muted">
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
