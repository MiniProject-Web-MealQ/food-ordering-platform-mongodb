import { ImageIcon } from "@/components/icons";
import { cx } from "@/lib/cx";

/** Stand-in for a photo that has not been supplied yet. */
export function ImagePlaceholder({ label, className }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cx(
        "flex flex-col items-center justify-center gap-2 border-2 border-dashed border-honey bg-oat p-4 text-center text-muted",
        className,
      )}
    >
      <ImageIcon className="size-7 text-muted" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
