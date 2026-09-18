import { ImageIcon } from "@/components/icons";
import { cx } from "@/lib/cx";

/** Stand-in for a photo that has not been supplied yet. */
export function ImagePlaceholder({ label, className, compact = false }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cx(
        "flex flex-col items-center justify-center border-2 border-dashed border-leaf bg-haze text-center text-muted",
        compact ? "p-1.5" : "gap-2 p-4",
        className,
      )}
    >
      {/* Compact thumbnails are too small for the icon; the label alone stands in for the photo. */}
      {!compact && <ImageIcon className="size-7 text-muted" />}
      <span className={cx("font-medium", compact ? "text-xs leading-tight" : "text-sm")}>
        {label}
      </span>
    </div>
  );
}
