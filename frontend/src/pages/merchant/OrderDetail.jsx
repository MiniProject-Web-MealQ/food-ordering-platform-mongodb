import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { OrderTimeline } from "@/features/merchant/components/order-timeline";
import { ReceiveCodeCard } from "@/features/merchant/components/receive-code-card";
import { ReceiveCodeForm } from "@/features/merchant/components/receive-code-form";
import { OrderStatusBadge } from "@/features/merchant/components/status-badge";
import { formatBaht, formatClock, formatElapsed, formatQueue, paymentLabel } from "@/features/merchant/format";
import { findOrder, queueFor } from "@/features/merchant/orders";
import { canCancel, nextStep } from "@/features/merchant/status";
import { useMerchant } from "@/features/merchant/store";
import { useMerchantActions } from "@/features/merchant/use-merchant-actions";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={cx("flex justify-between gap-4", strong ? "text-base font-bold text-ink" : "text-sm text-ink-soft")}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CancelPanel({ queueLabel, busy, onConfirm, onBack }) {
  return (
    <div role="group" aria-labelledby="cancel-title" className="space-y-3 rounded-2xl bg-alert/10 p-4">
      <p id="cancel-title" className="font-semibold text-danger">
        ยกเลิกคิว {queueLabel}?
      </p>
      {/* TODO(api): there is no refund in the API yet, so the copy says it has to be done by hand. */}
      <p className="text-sm text-ink">
        ยกเลิกแล้วย้อนกลับไม่ได้ ระบบยังไม่คืนเงินให้อัตโนมัติ ต้องคืนเงินให้ลูกค้าเอง
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
          className={buttonClasses({ variant: "danger-outline", size: "md" })}
        >
          {busy ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}
        </button>
        <button type="button" onClick={onBack} className={buttonClasses({ variant: "cocoa-outline", size: "md" })}>
          ไม่ยกเลิก
        </button>
      </div>
    </div>
  );
}

function ActionPanel({ order, queue, now, focusCode, scannedCode, handedOver, onHandedOver }) {
  const actions = useMerchantActions();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const step = nextStep(order.status);
  const queueLabel = formatQueue(queue.queue_number);

  async function run(request) {
    setBusy(true);
    setError("");
    const result = await request();
    setBusy(false);
    if (!result.ok) setError(result.error.message);
    return result;
  }

  if (order.status === "completed") {
    return (
      <div className="space-y-4">
        {handedOver ? (
          <Alert tone="success" title={`ส่งอาหารคิว ${queueLabel} เรียบร้อย`}>
            บันทึกลงระบบแล้ว ลูกค้าเห็นสถานะ “รับอาหารแล้ว” ในแอป
          </Alert>
        ) : (
          <p className="text-sm text-ink">ลูกค้ารับอาหารแล้วเมื่อ {formatClock(order.receive_time)}</p>
        )}
        <Link to="/merchant/orders" className={buttonClasses({ variant: "cocoa", size: "md", fullWidth: true })}>
          กลับไปกระดานคิว
        </Link>
      </div>
    );
  }

  if (order.status === "cancelled") {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-ink">
          ออเดอร์นี้ถูกยกเลิกแล้ว
        </p>
        <Link to="/merchant/orders" className={buttonClasses({ variant: "cocoa-outline", size: "md", fullWidth: true })}>
          กลับไปกระดานคิว
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert tone="error" title="บันทึกไม่สำเร็จ">{error}</Alert>}
      {order.status === "ready" ? (
        <>
          <p className="text-sm text-ink-soft">
            เรียกคิวแล้ว {formatElapsed(queue.called_at, now)} · ขอรหัสจากลูกค้าก่อนส่งอาหาร
          </p>
          <ReceiveCodeForm
            expectedCode={queue.receive_code}
            orderNumber={order.order_number}
            scannedCode={scannedCode}
            autoFocus={focusCode}
            onConfirm={async () => {
              const result = await actions.complete(order);
              if (result.ok) onHandedOver();
              return result;
            }}
          />
        </>
      ) : (
        <Button variant="cocoa" fullWidth disabled={busy} aria-busy={busy} onClick={() => run(() => actions.advance(order))}>
          {busy && !confirmingCancel ? "กำลังบันทึก…" : step.label}
        </Button>
      )}

      {canCancel(order.status) &&
        (confirmingCancel ? (
          <CancelPanel
            queueLabel={queueLabel}
            busy={busy}
            onConfirm={() => run(() => actions.cancel(order))}
            onBack={() => setConfirmingCancel(false)}
          />
        ) : (
          <Button variant="danger-outline" size="md" fullWidth onClick={() => setConfirmingCancel(true)}>
            ยกเลิกออเดอร์
          </Button>
        ))}
    </div>
  );
}

function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { state } = useMerchant();
  const now = useNow();
  const [handedOver, setHandedOver] = useState(false);
  const order = findOrder(state, id);
  const queue = order && queueFor(state, order._id);
  usePageTitle(order ? `คิว ${formatQueue(queue.queue_number)}` : "ไม่พบออเดอร์");

  if (!order) {
    return (
      <div className={pageClass}>
        <PageHeader title="ไม่พบออเดอร์" fallback="/merchant/orders" />
        <div className={cx(panelClass, "space-y-4 text-center")}>
          <p className="text-ink-soft">ไม่มีออเดอร์ “{id}” ในร้านนี้</p>
          <Link to="/merchant/orders" className={buttonClasses({ variant: "cocoa", size: "md" })}>
            กลับไปกระดานคิว
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <PageHeader
        title={`คิว ${formatQueue(queue.queue_number)}`}
        subtitle={`${order.order_number} · ${order.customer.name} · สั่งเมื่อ ${formatClock(order.order_date)}`}
        fallback="/merchant/orders"
        action={<OrderStatusBadge status={order.status} className="mt-2 px-3 py-1 text-sm" />}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <section aria-labelledby="items-title" className={panelClass}>
            <h2 id="items-title" className="mb-3 text-lg font-bold text-ink">
              รายการอาหาร
            </h2>
            <ul className="divide-y divide-haze">
              {order.items.map((item, index) => (
                <li key={`${item.menu_id}-${index}`} className="flex gap-3 py-3 first:pt-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint font-bold text-cocoa">
                    {item.quantity}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{item.name}</p>
                    {item.note && <p className="text-sm font-medium text-brand-ink">หมายเหตุ: {item.note}</p>}
                    <p className="text-xs text-ink-soft">{formatBaht(item.price)} / ที่</p>
                  </div>
                  <p className="shrink-0 font-semibold text-ink">{formatBaht(item.total_price)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-haze pt-3">
              <SummaryRow label="ราคาอาหาร" value={formatBaht(order.subtotal)} />
              {order.service_fee > 0 && <SummaryRow label="ค่าบริการ" value={formatBaht(order.service_fee)} />}
              {order.discount > 0 && <SummaryRow label="ส่วนลด" value={`−${formatBaht(order.discount)}`} />}
              <SummaryRow label="ยอดชำระ" value={formatBaht(order.total_price)} strong />
              <SummaryRow label="ชำระด้วย" value={`${paymentLabel(order.payment_method)} · ชำระแล้ว`} />
            </dl>
          </section>

          <section aria-labelledby="timeline-title" className={panelClass}>
            <h2 id="timeline-title" className="mb-4 text-lg font-bold text-ink">
              สถานะ
            </h2>
            <OrderTimeline order={order} queue={queue} />
          </section>
        </div>

        {/* Code and actions come first on phones: that is what staff need at the counter. */}
        <div className="space-y-4 max-lg:order-first lg:sticky lg:top-6">
          <ReceiveCodeCard code={queue.receive_code} status={order.status} />
          <section aria-labelledby="action-title" className={panelClass}>
            <h2 id="action-title" className="mb-3 text-lg font-bold text-ink">
              จัดการออเดอร์
            </h2>
            {/* Keyed by status so a half-finished cancel confirmation does not carry over to the next step. */}
            <ActionPanel
              key={order.status}
              order={order}
              queue={queue}
              now={now}
              focusCode={Boolean(location.state?.focusCode)}
              scannedCode={location.state?.scannedCode ?? ""}
              handedOver={handedOver}
              onHandedOver={() => setHandedOver(true)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
