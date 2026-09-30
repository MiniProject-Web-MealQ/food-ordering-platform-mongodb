import { useState } from "react";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { inKitchenCount } from "../orders";
import { useMerchant } from "../store";
import { useMerchantActions } from "../use-merchant-actions";

/** Dark card with the open/closed switch and how many orders are in the kitchen. */
export function StoreOpenCard({ id = "store-open" }) {
  const { state } = useMerchant();
  const { setStoreOpen } = useMerchantActions();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { store } = state;
  const hours = store.opening_hours;

  async function toggle(isOpen) {
    setSaving(true);
    setError("");
    const result = await setStoreOpen(isOpen);
    setSaving(false);
    if (!result.ok) setError(result.error.message);
  }

  return (
    <section aria-labelledby={`${id}-title`} aria-busy={saving} className="rounded-3xl bg-forest p-5 text-white sm:p-6">
      <h2 id={`${id}-title`} className="sr-only">
        สถานะร้าน
      </h2>
      <ToggleSwitch
        id={id}
        tone="dark"
        label="เปิดรับออเดอร์"
        checked={store.is_open}
        onChange={(isOpen) => {
          if (!saving) toggle(isOpen);
        }}
      />
      <p role="status" className="mt-1 text-sm text-white/75">
        {saving
          ? "กำลังบันทึก…"
          : store.is_open
            ? "ร้านเปิดอยู่ ลูกค้าเห็นร้านและสั่งอาหารได้"
            : "ร้านปิดอยู่ ลูกค้าสั่งใหม่ไม่ได้ ออเดอร์ที่ค้างอยู่ยังทำต่อได้ตามปกติ"}
      </p>
      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-alert/20 px-3 py-2 text-sm font-medium text-white">
          เปลี่ยนสถานะร้านไม่สำเร็จ: {error}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-white/70">เวลาเปิด–ปิด</p>
          <p className="text-lg font-semibold">
            {hours.open_time && hours.close_time ? `${hours.open_time}–${hours.close_time} น.` : "ยังไม่ได้ตั้ง"}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/70">คิวในครัวตอนนี้</p>
          <p className="text-lg font-semibold">{inKitchenCount(state)} คิว</p>
        </div>
      </div>
    </section>
  );
}
