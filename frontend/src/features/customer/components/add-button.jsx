import { useState } from "react";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { cx } from "@/lib/cx";
import { useQuickAdd } from "../use-quick-add";

export function AddButton({ menuItem, disabled = false, className }) {
  const quickAdd = useQuickAdd();
  const [added, setAdded] = useState(false);

  function handleClick(event) {
    // Rows are often inside a link to the food page; the button must not trigger it.
    event.preventDefault();
    event.stopPropagation();
    if (quickAdd(menuItem.id)) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`เพิ่ม ${menuItem.name} ลงตะกร้า`}
      className={cx(
        "grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:bg-haze disabled:text-ink-soft",
        className,
      )}
    >
      {added ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
      <span className="sr-only" aria-live="polite">
        {added ? "เพิ่มแล้ว" : ""}
      </span>
    </button>
  );
}
