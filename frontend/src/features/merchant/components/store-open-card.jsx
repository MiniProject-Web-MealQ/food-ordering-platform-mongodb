import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { inKitchenCount } from "../orders";
import { useMerchant } from "../store";

/** Dark card with the open/closed switch and how full the kitchen queue is. */
export function StoreOpenCard({ id = "store-open" }) {
  const { state, dispatch } = useMerchant();
  const { store } = state;
  const inKitchen = inKitchenCount(state);
  const max = store.queue.max_queue;
  const percent = Math.min(100, Math.round((inKitchen / max) * 100));

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-3xl bg-forest p-5 text-white sm:p-6">
      <h2 id={`${id}-title`} className="sr-only">
        สถานะร้าน
      </h2>
      <ToggleSwitch
        id={id}
        tone="dark"
        label="เปิดรับออเดอร์"
        checked={store.is_open}
        onChange={(isOpen) => dispatch({ type: "store/setOpen", isOpen })}
      />
      <p role="status" className="mt-1 text-sm text-white/75">
        {store.is_open
          ? "ร้านเปิดอยู่ ลูกค้าเห็นร้านและสั่งอาหารได้"
          : "ร้านปิดอยู่ ลูกค้าสั่งใหม่ไม่ได้ ออเดอร์ที่ค้างอยู่ยังทำต่อได้ตามปกติ"}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-white/70">เวลาเปิด–ปิด</p>
          <p className="text-lg font-semibold">
            {store.opening_hours.open_time}–{store.opening_hours.close_time} น.
          </p>
        </div>
        <div>
          <p id={`${id}-queue`} className="text-xs text-white/70">
            คิวในครัว
          </p>
          <p className="text-lg font-semibold">
            {inKitchen} / {max} คิว
          </p>
          <div
            role="progressbar"
            aria-labelledby={`${id}-queue`}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={inKitchen}
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"
          >
            <div
              className={percent >= 100 ? "h-full rounded-full bg-alert" : "h-full rounded-full bg-brand"}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
