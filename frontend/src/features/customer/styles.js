import { cx } from "@/lib/cx";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Filter / category chip. `selected` chips read as pressed. */
export function chipClasses({ selected = false, tone = "light" } = {}) {
  return cx(
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors",
    focus,
    tone === "highlight"
      ? "bg-cocoa/10 text-cocoa hover:bg-cocoa/15"
      : tone === "applied"
      ? "bg-mint text-brand-ink hover:bg-leaf/50"
      : tone === "dark"
      ? selected
        ? "bg-brand text-white"
        : "bg-white/10 text-white/85 hover:bg-white/20"
      : selected
        ? "bg-forest text-white"
        : "bg-cream text-ink ring-1 ring-haze hover:bg-haze",
  );
}

export const cardLinkClass = `block rounded-3xl transition-shadow hover:shadow-card ${focus}`;

/** Page width + side gutters shared by the customer header and every customer page. */
export const containerClass = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

/** Sidebars on desktop two-column pages stay in view below the 72px header. */
export const stickySidebarClass = "lg:sticky lg:top-24";

/** Rows in a horizontally scrolling strip bleed to the screen edge but keep the container's first/last inset. */
export const scrollStripClass =
  "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6";
