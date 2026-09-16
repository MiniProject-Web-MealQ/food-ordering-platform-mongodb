export function Checkbox({ id, label, ...props }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-5 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-md border-2 border-honey bg-linen transition-colors checked:border-apricot checked:bg-apricot focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-invalid:border-coral"
          {...props}
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute hidden size-3.5 text-white peer-checked:block"
        >
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <label htmlFor={id} className="cursor-pointer text-sm text-ink">
        {label}
      </label>
    </div>
  );
}
