import { BellRing, Clock } from "lucide-react";
import { Link } from "react-router";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { cx } from "@/lib/cx";
import { formatBaht, formatClock, formatElapsed, formatQueue } from "../format";
import { nextStep } from "../status";
import { OrderStatusBadge } from "./status-badge";

const MINUTE = 60 * 1000;

/** การ์ดอยู่ในสถานะปัจจุบันมานานแค่ไหน และนานพอจะขึ้นเตือนหรือยัง */
function timing(order, queue, now) {
  switch (order.status) {
    case "pending":
      return { text: `รอ ${formatElapsed(order.order_date, now)}`, late: now - order.order_date >= 5 * MINUTE };
    case "confirmed":
    case "preparing":
      return { text: `สั่งมา ${formatElapsed(order.order_date, now)}`, late: false };
    case "ready":
      return {
        text: `เรียกแล้ว ${formatElapsed(queue?.called_at ?? now, now)}`,
        late: now - (queue?.called_at ?? now) >= 15 * MINUTE,
      };
    case "completed":
      return { text: `รับเมื่อ ${formatClock(order.receive_time)}`, late: false };
    default:
      return { text: `สั่งเมื่อ ${formatClock(order.order_date)}`, late: false };
  }
}

const LATE_LABEL = { pending: "รอนานแล้ว", ready: "ลูกค้ายังไม่มารับ" };

export function OrderCard({ order, queue, now, busy = false, onAdvance }) {
  const step = nextStep(order.status);
  const { text, late } = timing(order, queue, now);
  const detailPath = `/merchant/orders/${order.order_number}`;
  const finished = order.status === "completed" || order.status === "cancelled";
  const queueLabel = formatQueue(queue?.queue_number ?? 0);

  return (
    <article
      aria-labelledby={`order-${order._id}-title`}
      className={cx("rounded-3xl bg-white p-4 ring-1", late ? "ring-2 ring-alert" : "ring-haze", finished && "opacity-75")}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={`order-${order._id}-title`} className="font-display text-3xl leading-none font-black text-ink">
          <span className="sr-only">คิว </span>
          {queueLabel}
        </h3>
        <OrderStatusBadge status={order.status} />
      </div>
      {/* ในคอลัมน์แคบของจอ lg ให้ขึ้นบรรทัดใหม่ แทนการตัดชื่อลูกค้า */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
        <p className="text-ink-soft">
          {order.order_number} · {order.customer.name}
        </p>
        <p className={cx("flex items-center gap-1", late ? "font-semibold text-danger" : "text-ink-soft")}>
          <Clock aria-hidden="true" className="size-3.5" />
          {text}
        </p>
      </div>

      {late && (
        <p className="mt-2 rounded-xl bg-alert/10 px-3 py-1.5 text-xs font-semibold text-danger">
          {LATE_LABEL[order.status]}
        </p>
      )}

      <ul className="mt-3 space-y-1.5 text-sm text-ink">
        {order.items.map((item, index) => (
          <li key={`${item.menu_id}-${index}`}>
            <span className="font-bold text-cocoa">{item.quantity}×</span> {item.name}
            {item.note && <span className="block pl-5 text-xs font-medium text-brand-ink">หมายเหตุ: {item.note}</span>}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-haze pt-3 text-sm">
        <Link
          to={detailPath}
          className={cx("rounded font-semibold text-brand-ink underline-offset-4 hover:underline", focusRing)}
        >
          รายละเอียด<span className="sr-only"> คิว {queueLabel}</span>
        </Link>
        <span className="font-bold text-ink">{formatBaht(order.total_price)}</span>
      </div>

      {step && (
        <button
          type="button"
          onClick={() => onAdvance(order, step)}
          disabled={busy}
          aria-busy={busy}
          className={cx(buttonClasses({ variant: "cocoa", size: "md", fullWidth: true }), "mt-3 whitespace-normal")}
        >
          {busy ? "กำลังบันทึก…" : step.label}
          <span className="sr-only"> คิว {queueLabel}</span>
        </button>
      )}
      {order.status === "ready" && (
        <Link
          to={detailPath}
          state={{ focusCode: true }}
          className={cx(buttonClasses({ variant: "cocoa-outline", size: "md", fullWidth: true }), "mt-3")}
        >
          <BellRing aria-hidden="true" className="size-4" />
          ยืนยันรับอาหาร<span className="sr-only"> คิว {queueLabel}</span>
        </Link>
      )}
    </article>
  );
}
