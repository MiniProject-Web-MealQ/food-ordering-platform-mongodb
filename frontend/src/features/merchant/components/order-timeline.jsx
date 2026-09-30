import { Check } from "lucide-react";
import { cx } from "@/lib/cx";
import { formatClock } from "../format";
import { ORDER_STATUS_LABEL, ORDER_STEPS } from "../status";

const STEP_LABEL = {
  pending: "ลูกค้าสั่งและชำระเงิน",
  confirmed: "ร้านรับออเดอร์",
  preparing: "กำลังทำอาหาร",
  ready: "เรียกคิว · พร้อมรับ",
  completed: "ลูกค้ารับอาหารแล้ว",
};

/** Only the times the backend models keep: order_date, queue.called_at and receive_time. */
function stepTime(step, order, queue) {
  if (step === "pending") return order.order_date;
  if (step === "ready") return queue?.called_at;
  if (step === "completed") return order.receive_time;
  return null;
}

export function OrderTimeline({ order, queue }) {
  if (order.status === "cancelled") {
    return (
      <p className="rounded-2xl bg-haze px-4 py-3 text-sm text-ink">
        ออเดอร์นี้{ORDER_STATUS_LABEL.cancelled} · สั่งเมื่อ {formatClock(order.order_date)}
      </p>
    );
  }

  const current = ORDER_STEPS.indexOf(order.status);

  return (
    <ol className="space-y-0">
      {ORDER_STEPS.map((step, index) => {
        const done = index < current || order.status === "completed";
        const active = index === current && order.status !== "completed";
        const time = stepTime(step, order, queue);
        return (
          <li key={step} className="relative flex gap-3 pb-5 last:pb-0">
            {index < ORDER_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cx("absolute top-7 bottom-0 left-3.5 w-0.5 -translate-x-1/2", done ? "bg-cocoa" : "bg-haze")}
              />
            )}
            <span
              aria-hidden="true"
              className={cx(
                "relative grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                done ? "bg-cocoa text-white" : active ? "bg-brand text-ink ring-4 ring-brand/25" : "bg-haze text-ink-soft",
              )}
            >
              {done ? <Check className="size-4" /> : index + 1}
            </span>
            <div className="pt-0.5">
              <p className={cx("text-sm", active || done ? "font-semibold text-ink" : "text-ink-soft")}>
                {STEP_LABEL[step]}
                {active && <span className="sr-only"> (สถานะปัจจุบัน)</span>}
              </p>
              {time && <p className="text-xs text-ink-soft">{formatClock(time)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
