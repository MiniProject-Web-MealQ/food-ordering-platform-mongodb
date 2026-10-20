import { Link } from "react-router";
import { currentStatus, getOrderRestaurant, orderProgress, statusLabel } from "../catalog";
import { formatBaht, formatOrderCode, formatRange } from "../format";

/** Espresso card for an order that has not been picked up yet. */
export function ActiveOrderCard({ order, variant = "home" }) {
  const restaurant = getOrderRestaurant(order);
  const status = currentStatus(order);
  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0);
  const ready = status === "READY";

  return (
    <article className="relative rounded-4xl bg-forest p-5 text-white">
      <div className="flex items-center justify-between text-xs">
        <p className="flex items-center gap-2 font-semibold tracking-wide text-brand">
          <span aria-hidden="true" className="size-2 rounded-full bg-brand" />
          {statusLabel(status)}
        </p>
        <p className="shrink-0 text-white/60">{formatOrderCode(order.id)}</p>
      </div>

      <div className="mt-2 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">
            <Link
              to={`/customer/orders/${order.id}`}
              className="after:absolute after:inset-0 after:rounded-4xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
            >
              {restaurant.name}
              {variant === "home" && ` · ${itemCount} รายการ`}
            </Link>
          </h3>
          <p className="truncate text-sm text-white/75">
            {variant === "home"
              ? `คิวของคุณ #${order.queueNumber} · ${order.nowServing ? `กำลังทำคิว #${order.nowServing}` : "รอร้านเริ่มทำอาหาร"}`
              : order.items.map((item) => `${item.qty}× ${item.name}`).join(" · ")}
          </p>
        </div>
        {variant === "home" && (
          <p className="shrink-0 text-right">
            <span className="block font-display text-3xl leading-none font-black">
              {ready ? "พร้อม" : formatRange(order.etaMinutes)}
            </span>
            <span className="text-xs text-white/60">{ready ? "เดินมารับได้เลย" : "นาที (ประมาณ)"}</span>
          </p>
        )}
      </div>

      {variant === "home" ? (
        <div
          role="progressbar"
          aria-label="ความคืบหน้าออเดอร์"
          aria-valuenow={Math.round(orderProgress(order) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${orderProgress(order) * 100}%` }} />
        </div>
      ) : (
        <div className="mt-3 flex items-end justify-between">
          <p className="text-xl font-bold">{formatBaht(order.total)}</p>
          <p className="text-sm text-white/75">
            คิว #{order.queueNumber} · {ready ? "พร้อมรับ" : `${formatRange(order.etaMinutes)} นาที`}
          </p>
        </div>
      )}
    </article>
  );
}
