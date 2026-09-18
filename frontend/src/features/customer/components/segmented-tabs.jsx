import { cx } from "@/lib/cx";

/**
 * Pill tab strip. Renders only the tab buttons; the caller renders the panel with
 * id `${idPrefix}-panel` and aria-labelledby `${idPrefix}-${activeValue}`.
 */
export function SegmentedTabs({ idPrefix, label, tabs, value, onChange }) {
  function handleKeyDown(event) {
    const index = tabs.findIndex((t) => t.value === value);
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    onChange(next.value);
    document.getElementById(`${idPrefix}-${next.value}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-haze p-1.5"
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            id={`${idPrefix}-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cx(
              "h-10 rounded-full text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              selected ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
