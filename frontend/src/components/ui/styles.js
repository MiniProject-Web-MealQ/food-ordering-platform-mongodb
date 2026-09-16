import { cx } from "@/lib/cx";

/** Keyboard focus indicator for buttons and links. Ink keeps 3:1+ contrast on every palette surface. */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Inline text link: bold dark-apricot text, underlined on hover. */
export const textLinkClass = `rounded font-semibold text-apricot-ink underline-offset-4 hover:underline ${focusRing}`;

const BUTTON_VARIANTS = {
  primary:
    "bg-apricot text-ink hover:bg-coral disabled:bg-butter disabled:text-ink/40 disabled:hover:bg-butter",
  outline: "border-2 border-honey bg-white text-ink hover:bg-butter",
  soft: "bg-butter text-ink hover:bg-honey",
  secondary: "border-2 border-butter bg-linen text-ink hover:bg-butter",
  dark: "bg-ink text-butter hover:bg-ink/85",
};

const BUTTON_SIZES = {
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
