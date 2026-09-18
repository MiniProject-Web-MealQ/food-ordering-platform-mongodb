import { cx } from "@/lib/cx";

/** Keyboard focus indicator for buttons and links. Ink keeps 3:1+ contrast on every palette surface. */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Inline text link: brand-green text, underlined on hover. */
export const textLinkClass = `rounded font-semibold text-brand-ink underline-offset-4 hover:underline ${focusRing}`;

const BUTTON_VARIANTS = {
  primary:
    "bg-brand text-ink hover:bg-brand-dark disabled:bg-mint disabled:text-ink/40 disabled:hover:bg-mint",
  outline: "border-2 border-leaf bg-white text-ink hover:bg-mint",
  soft: "bg-mint text-ink hover:bg-leaf",
  secondary: "border-2 border-mint bg-snow text-ink hover:bg-mint",
  dark: "bg-forest text-white hover:bg-forest/90",
  cocoa:
    "bg-cocoa text-white hover:bg-cocoa/90 disabled:bg-haze disabled:text-ink-soft disabled:hover:bg-haze",
  "cocoa-outline": "border-2 border-cocoa/40 bg-white text-cocoa hover:bg-cream",
  "danger-outline": "border-2 border-alert/50 bg-white text-danger hover:bg-alert/10",
};

const BUTTON_SIZES = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-7 text-base",
};

/**
 * Shared by <Button> and link-styled buttons (<Link className={buttonClasses()}>).
 * Lives here rather than in button.jsx so that file only exports components (React Fast Refresh).
 */
export function buttonClasses({ variant = "primary", size = "lg", fullWidth = false } = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed",
    focusRing,
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    fullWidth && "w-full",
  );
}
