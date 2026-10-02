import { Ban } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { ReasonDialog } from "@/features/admin/components/reason-dialog";
import { formatBaht, formatDateTime } from "@/features/admin/format";
import { CANCEL_BY_LABEL } from "@/features/admin/labels";
import { ACTIVE_ORDER_STATUSES, byId } from "@/features/admin/stats";
import { actions, useAdmin } from "@/features/admin/store";
import { OrderTimeline } from "@/features/merchant/components/order-timeline";
import { OrderStatusBadge } from "@/features/merchant/components/status-badge";
import { formatQueue, paymentLabel } from "@/features/merchant/format";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function Row({ label, value, strong = false }) {
  return (
    <div className={cx("flex justify-between gap-4", strong ? "text-base font-bold text-ink" : "text-sm text-ink-soft")}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function OrderDetail() {
  const { id } = useParams();
  const { state, dispatch } = useAdmin();
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const order = state.orders.find((o) => o.order_number === id || o._id === id);
  usePageTitle(order ? order.order_number : "ไม่พบออเดอร์");

  if (!order) {
    return (
      <div className={pageClass}>
        <PageHeader title="ไม่พบออเดอร์" fallback="/admin/orders" />
        <div className={cx(panelClass, "space-y-4 text-center")}>
          <p className="text-ink-soft">ไม่มีออเดอร์ “{id}” ในระบบ</p>
          <Link to="/admin/orders" className={buttonClasses({ variant: "cocoa", size: "md" })}>
            กลับไปรายการออเดอร์
          </Link>
        </div>
      </div>
    );
  }

  const store = byId(state.stores, order.store_id);
  const customer = byId(state.users, order.customer_id);
  const active = ACTIVE_ORDER_STATUSES.includes(order.status);
  // แปลงเป็นรูปแบบที่ timeline ของหน้าร้านใช้
  const timelineOrder = { status: order.status, order_date: order.order_date, receive_time: order.status === "completed" ? order.updated_at : null };
  const timelineQueue = { called_at: order.status === "ready" ? order.updated_at : null };


  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader
        title={order.order_number}
        subtitle={`${store?.name ?? "–"} · สั่งเมื่อ ${formatDateTime(order.order_date)}`}
        fallback="/admin/orders"
        action={<OrderStatusBadge status={order.status} className="mt-2 px-3 py-1 text-sm" />}
      />
      <p role="status" className={notice ? "rounded-2xl bg-mint px-4 py-2 text-sm font-medium text-ink" : "sr-only"}>
        {notice}
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <section aria-labelledby="items-title" className={panelClass}>
            <h2 id="items-title" className="mb-3 text-lg font-bold text-ink">
              รายการอาหาร
            </h2>
            <ul className="divide-y divide-haze">
              {order.items.map((item, index) => (
                <li key={`${item.menu_id}-${index}`} className="flex gap-3 py-2.5 first:pt-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint font-bold text-cocoa">{item.quantity}×</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-ink-soft">{formatBaht(item.price)} / ที่</p>
                  </div>
                  <p className="shrink-0 font-semibold text-ink">{formatBaht(item.total_price)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-haze pt-3">
              <Row label="ราคาอาหาร" value={formatBaht(order.subtotal)} />
              <Row label="ค่าบริการ" value={formatBaht(order.service_fee)} />
              {order.discount > 0 && <Row label={`ส่วนลด (${order.promotion?.code ?? "–"})`} value={`−${formatBaht(order.discount)}`} />}
              <Row label="ยอดชำระ" value={formatBaht(order.total_price)} strong />
              <Row label="ชำระด้วย" value={paymentLabel(order.payment_method)} />
            </dl>
          </section>

          <section aria-labelledby="timeline-title" className={panelClass}>
            <h2 id="timeline-title" className="mb-4 text-lg font-bold text-ink">
              สถานะ
            </h2>
            <OrderTimeline order={timelineOrder} queue={timelineQueue} />
            {order.cancel && (
              <p className="mt-3 rounded-2xl bg-haze px-4 py-3 text-sm text-ink">
                ยกเลิกโดย{CANCEL_BY_LABEL[order.cancel.by] || "?????????"} · {formatDateTime(order.cancel.at)}
                <span className="block text-ink-soft">เหตุผล: {order.cancel.reason}</span>
              </p>
            )}
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          <section aria-labelledby="people-title" className={panelClass}>
            <h2 id="people-title" className="mb-3 text-lg font-bold text-ink">
              ร้าน ลูกค้า และคิว
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-xs text-ink-soft">ร้าน</dt>
                <dd>
                  {store ? (
                    <Link to={`/admin/stores/${store._id}`} className={textLinkClass}>
                      {store.name}
                    </Link>
                  ) : (
                    "–"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-soft">ลูกค้า</dt>
                <dd>
                  {customer ? (
                    <Link to={`/admin/users/${customer._id}`} className={textLinkClass}>
                      {customer.name}
                    </Link>
                  ) : (
                    "–"
                  )}
                </dd>
              </div>
              <div className="flex gap-6">
                <div>
                  <dt className="text-xs text-ink-soft">เลขคิว</dt>
                  <dd className="font-display text-2xl font-black text-ink">{order.queue.queue_number == null ? "–" : formatQueue(order.queue.queue_number)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-soft">รหัสรับอาหาร</dt>
                  <dd className="font-display text-2xl font-black tracking-widest text-ink">{order.queue.receive_code}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section aria-labelledby="admin-actions-title" className={cx(panelClass, "space-y-3")}>
            <h2 id="admin-actions-title" className="text-lg font-bold text-ink">
              ผู้ดูแลจัดการ
            </h2>
            {order.refund && (
              <Alert tone="success" title={`คืนเงินแล้ว ${formatBaht(order.refund.amount)}`}>
                {order.refund.method === "wallet" ? "เข้า MealQ Wallet" : "ผ่านช่องทางเดิม"} · {formatDateTime(order.refund.at)}
                {order.refund.note ? ` · ${order.refund.note}` : ""}
              </Alert>
            )}
            {active && (
              <Button variant="danger-outline" size="md" fullWidth onClick={() => setDialog("cancel")}>
                <Ban aria-hidden="true" className="size-4" />
                ยกเลิกออเดอร์แทนร้าน
              </Button>
            )}

            {!active && !order.refund && <p className="text-sm text-ink-soft">ออเดอร์นี้จบแล้ว ไม่มีอะไรต้องจัดการ</p>}
            <p className="text-xs text-ink-soft">ผู้ดูแลเลื่อนสถานะการทำอาหารแทนร้านไม่ได้ ให้ร้านเป็นคนกดในหน้าร้านค้า</p>
          </section>
        </div>
      </div>

      {dialog === "cancel" && (
        <ReasonDialog
          title="ยกเลิกออเดอร์แทนร้าน"
          subtitle={`${order.order_number} · ${store?.name}`}
          description="ใช้เมื่อร้านติดต่อไม่ได้หรือออเดอร์มีปัญหา หลังยกเลิกให้บันทึกการคืนเงินต่อ"
          confirmLabel="ยกเลิกออเดอร์"
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            const result = await dispatch(actions.cancelOrder(order._id, reason));
            if (!result.ok) return result.error?.message || "???????????????";
            setNotice(`ยกเลิกออเดอร์ ${order.order_number} แล้ว อย่าลืมบันทึกการคืนเงิน`);
            setDialog(null);
          }}
        />
      )}

    </div>
  );
}

export default OrderDetail;
