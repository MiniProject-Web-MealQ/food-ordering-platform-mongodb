import { MinusIcon, PlusIcon } from "@/components/icons";
import { cx } from "@/lib/cx";

const stepButton =
  "grid place-items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function QtyStepper({ value, onChange, min = 0, max = 20, label, size = "md" }) {
  const small = size === "sm";

  return (
    <div
      role="group"
      aria-label={label}
      className={cx("inline-flex items-center rounded-full", small ? "gap-2" : "gap-3 bg-haze p-1.5")}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={value - 1 === 0 ? "ลบออกจากตะกร้า" : "ลดจำนวน"}
        className={cx(stepButton, "bg-haze text-ink hover:bg-mint", small ? "size-8" : "size-9 bg-white")}
      >
        <MinusIcon className="size-4" />
      </button>
      <output aria-live="polite" className="min-w-5 text-center font-semibold text-ink">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="เพิ่มจำนวน"
        className={cx(stepButton, "bg-cocoa text-white hover:bg-cocoa/90", small ? "size-8" : "size-9")}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
