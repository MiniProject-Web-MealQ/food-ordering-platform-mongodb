import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { cx } from "@/lib/cx";
import { panelClass } from "../styles";

export function DeleteMenu({ menu, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-labelledby="delete-menu-title" className={cx(panelClass, "mt-4 space-y-3 lg:mt-6")}>
      <h3 id="delete-menu-title" className="font-bold text-ink">
        ลบเมนู
      </h3>
      <p className="text-sm text-ink-soft">
        ถ้าแค่ของหมดชั่วคราว ให้ปิดสวิตช์ “มีขาย” แทน ลบแล้วลูกค้าจะไม่เห็นเมนูนี้อีก และกู้คืนไม่ได้
      </p>
      {confirming ? (
        <div role="group" aria-label={`ยืนยันลบ ${menu.name}`} className="flex flex-wrap gap-2">
          <button type="button" onClick={onDelete} className={buttonClasses({ variant: "danger-outline", size: "md" })}>
            ยืนยันลบ “{menu.name}”
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={buttonClasses({ variant: "cocoa-outline", size: "md" })}>
            ไม่ลบ
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={buttonClasses({ variant: "danger-outline", size: "md" })}>
          ลบเมนูนี้
        </button>
      )}
    </section>
  );
}
