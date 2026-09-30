import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { focusRing } from "@/components/ui/styles";
import { cx } from "@/lib/cx";

/**
 * Modal built on <dialog>.showModal(): the browser traps focus, makes the page behind inert and
 * closes on Escape. Phones get a full-screen sheet; larger screens a centred card with a scrolling body.
 */
export function MerchantDialog({ eyebrow, title, subtitle, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    // Stop the page behind from scrolling while the dialog is open.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="merchant-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Only the backdrop hits the <dialog> itself; the content fills the box.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cx(
        "m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-4xl bg-page p-0 text-ink shadow-float backdrop:bg-forest/60",
        "max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none",
      )}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col max-sm:h-dvh max-sm:max-h-none">
        <header className="flex items-start gap-4 border-b border-haze bg-white px-5 py-4 sm:px-8 sm:py-6">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="text-xs font-semibold text-brand-ink">{eyebrow}</p>}
            <h2 id="merchant-dialog-title" className="text-2xl leading-tight font-bold text-ink sm:text-3xl">
              {title}
            </h2>
            {subtitle && <p className="mt-1 truncate text-sm text-ink-soft">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className={cx("grid size-11 shrink-0 place-items-center rounded-full text-ink ring-1 ring-haze hover:bg-cream", focusRing)}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">{children}</div>
      </div>
    </dialog>
  );
}
