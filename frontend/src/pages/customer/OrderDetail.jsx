import { useState } from "react";
import { Link, useParams } from "react-router";
import { CheckIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/styles";
import { currentStatus, getOrderRestaurant, ORDER_STEPS, statusLabel } from "@/features/customer/catalog";
import { cancelOrder } from "@/features/customer/api";
import { PageHeader } from "@/features/customer/components/page-header";
import { PickupCode } from "@/features/customer/components/pickup-code";
import { formatBaht, formatClock, formatRange } from "@/features/customer/format";
import { PAYMENT_METHODS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { containerClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";
import NotFoundPage from "@/pages/not-found";

function stepDetail(status, order, restaurant) {
  const at = order.statusTimes[status];
  if (!at) return "—";
  const time = formatClock(at);
  const method = PAYMENT_METHODS.find((m) => m.id === order.paymentMethod);
  return {
    PLACED: time,
    PAID: `${time} · ${method?.label.replace(" QR", "") || order.paymentMethod}${order.paymentMode === "sandbox" ? " (ทดสอบ)" : ""}`,
    QUEUED: `${time} · คิว #${order.queueNumber}`,
    PREPARING: `${time} · ร้านเริ่มทำแล้ว`,
    READY: `${time} · รับที่${restaurant.pickupPoint}`,
    PICKED_UP: time,
  }[status];
}

function OrderDetail() {
  const { id } = useParams();
  usePageTitle(`ออเดอร์ #${id}`);
  const { state, dispatch } = useCustomer();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const order = state.orders.find((o) => o.id === id);

  if (!order) return <NotFoundPage />;

  const restaurant = getOrderRestaurant(order);
  const status = currentStatus(order);
  const statusIndex = ORDER_STEPS.findIndex((s) => s.status === status);
  const done = status === "PICKED_UP";
  const cancelled = status === "CANCELLED";
  const ready = status === "READY";
  const notes = order.items.filter((item) => item.note);

  async function handleCancel() {
    if (cancelling || !window.confirm("ยืนยันยกเลิกออเดอร์นี้?")) return;
    setCancelling(true);
    const result = await cancelOrder(order.id);
    if (result.ok) { dispatch({ type: "order/upsert", order: result.data.order }); setError(null); }
    else setError(result.error?.message || "ยกเลิกออเดอร์ไม่สำเร็จ");
    setCancelling(false);
  }

  return (
    <div className={cx(containerClass, "pb-8 lg:pb-16")}>
      <PageHeader
        title={`ออเดอร์ #${order.id}`}
        subtitle={`${restaurant.name} · ${formatClock(order.statusTimes.PLACED)}`}
        fallback="/customer/orders"
        action={
          ["PLACED", "QUEUED"].includes(status) && (
            <button
              type="button"
              disabled={cancelling}
              onClick={handleCancel}
              className={cx(buttonClasses({ variant: "soft", size: "sm" }), "mt-1")}
            >
              {cancelling ? "กำลังยกเลิก…" : "ยกเลิกออเดอร์"}
            </button>
          )
        }
      />
      {error && <p role="alert" className="mb-4 text-danger">{error}</p>}
      {cancelled && <p className="mb-4 rounded-3xl bg-alert/10 p-4 text-danger">ออเดอร์นี้ถูกยกเลิกแล้ว · {formatClock(order.statusTimes.CANCELLED)}</p>}

      {/* Desktop: status, pickup code and items on the left; the timeline stays in view on the right. */}
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-5 lg:space-y-0">
        <section aria-live="polite" className="rounded-4xl bg-forest p-6 text-white lg:col-start-1 lg:p-8">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-brand">
            <span aria-hidden="true" className="size-2 rounded-full bg-brand" />
            {statusLabel(status)}
          </p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-6xl leading-none font-black lg:text-8xl">#{order.queueNumber}</p>
              <p className="mt-2 text-sm text-white/75">
                {cancelled ? "ยกเลิกออเดอร์แล้ว" : done ? "รับอาหารเรียบร้อย" : `กำลังทำคิว #${order.nowServing}`}
              </p>
            </div>
            {!done && !cancelled && (
              <p className="text-right">
                <span className="block text-2xl font-bold">
                  {ready ? "พร้อมรับ" : `${formatRange(order.etaMinutes)} นาที`}
                </span>
                <span className="text-xs text-white/60">{ready ? restaurant.pickupPoint : "ประมาณ"}</span>
              </p>
            )}
          </div>
        </section>

        {ready && (
          <section aria-labelledby="ready-code" className="rounded-4xl bg-mint/50 p-5 lg:col-start-1">
            <h2 id="ready-code" className="mb-3 text-center font-bold text-ink">
              แสดงรหัสนี้ตอนรับอาหาร
            </h2>
            <PickupCode code={order.pickupCode} />
          </section>
        )}

        <section
          aria-label="สถานะออเดอร์"
          className="rounded-4xl bg-cream px-6 py-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:py-7"
        >
          <ol>
            {ORDER_STEPS.map((step, index) => {
              const reached = cancelled ? Boolean(order.statusTimes[step.status]) : index <= statusIndex;
              const current = index === statusIndex && !done;
              const last = index === ORDER_STEPS.length - 1;
              return (
                <li
                  key={step.status}
                  aria-current={current ? "step" : undefined}
                  className="relative flex gap-4 pb-6 last:pb-0"
                >
                  {!last && (
                    <span
                      aria-hidden="true"
                      className={cx(
                        "absolute top-8 bottom-0 left-3.75 w-0.5",
                        index < statusIndex ? "bg-leaf" : "bg-haze",
                      )}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={cx(
                      "relative grid size-8 shrink-0 place-items-center rounded-full",
                      current
                        ? "bg-brand ring-4 ring-mint"
                        : reached
                          ? "bg-cocoa text-white"
                          : "bg-haze",
                    )}
                  >
                    {reached && !current && <CheckIcon className="size-4" strokeWidth={3} />}
                  </span>
                  <div>
                    <p className={cx("font-bold", reached ? "text-ink" : "text-ink-soft")}>
                      {step.label}
                      <span className="sr-only">{reached ? (current ? " (ตอนนี้)" : " (เสร็จแล้ว)") : " (ยังไม่ถึง)"}</span>
                    </p>
                    <p className="text-sm text-ink-soft">{stepDetail(step.status, order, restaurant)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="order-items" className="rounded-4xl bg-cream p-6 lg:col-start-1">
          <h2 id="order-items" className="font-bold text-ink">
            รายการในออเดอร์
          </h2>
          <ul className="mt-3 space-y-2 text-ink">
            {order.items.map((item) => (
              <li key={item.key} className="flex justify-between gap-3">
                <span>
                  {item.qty}× {item.name}
                  {item.optionLabels.length > 0 && ` (${item.optionLabels.join(", ")})`}
                </span>
                <span>{formatBaht(item.unitPrice * item.qty)}</span>
              </li>
            ))}
          </ul>
          {notes.length > 0 && (
            <p className="mt-3 text-sm text-ink-soft">หมายเหตุ: {notes.map((item) => item.note).join(" / ")}</p>
          )}
          <p className="mt-3 flex justify-between border-t border-haze pt-3 font-bold text-ink">
            <span>ยอดชำระ</span>
            <span>{formatBaht(order.total)}</span>
          </p>
        </section>

        {done && (
          <div className="lg:col-start-1">
            <Link
              to={`/customer/orders/${order.id}/review`}
              className={buttonClasses({ variant: order.review ? "outline" : "primary", fullWidth: true })}
            >
              {order.review ? `รีวิวแล้ว ${"★".repeat(order.review.rating)} · แก้ไข` : "ให้คะแนนอาหาร"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderDetail;
