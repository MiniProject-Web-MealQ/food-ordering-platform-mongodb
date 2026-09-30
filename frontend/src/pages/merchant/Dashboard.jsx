import { BellRing, ChefHat, ReceiptText, Wallet } from "lucide-react";
import { Link } from "react-router";
import { focusRing, textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { StatCard } from "@/features/merchant/components/stat-card";
import { OrderStatusBadge } from "@/features/merchant/components/status-badge";
import { StoreOpenCard } from "@/features/merchant/components/store-open-card";
import { formatBaht, formatClock, formatQueue } from "@/features/merchant/format";
import { itemCount, pendingCount, queueFor, todaysOrders, todaySummary } from "@/features/merchant/orders";
import { useMerchant } from "@/features/merchant/store";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const dateFormat = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long" });

function TopMenus({ items }) {
  const most = items[0]?.quantity ?? 0;

  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">ยังไม่มีเมนูที่ขายได้วันนี้</p>;
  }

  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.menuId}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="min-w-0 truncate font-semibold text-ink">
              <span className="mr-2 text-cocoa">{index + 1}.</span>
              {item.name}
            </p>
            <p className="shrink-0 text-ink-soft">
              {item.quantity} ที่ · {formatBaht(item.revenue)}
            </p>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-haze">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(item.quantity / most) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function RecentOrders({ state, now }) {
  const recent = todaysOrders(state, now).slice(0, 5);

  if (recent.length === 0) {
    return <p className="text-sm text-ink-soft">ยังไม่มีออเดอร์วันนี้</p>;
  }

  return (
    <ul className="divide-y divide-haze">
      {recent.map((order) => (
        <li key={order._id}>
          <Link
            to={`/merchant/orders/${order.order_number}`}
            className={cx("-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-cream", focusRing)}
          >
            <span className="w-12 shrink-0 font-display text-xl font-black text-ink">
              {formatQueue(queueFor(state, order._id)?.queue_number ?? 0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{order.customer.name}</span>
              <span className="block text-xs text-ink-soft">
                {formatClock(order.order_date)} · {itemCount(order)} ที่ · {formatBaht(order.total_price)}
              </span>
            </span>
            <OrderStatusBadge status={order.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Dashboard() {
  usePageTitle("ภาพรวมร้าน");
  const { state } = useMerchant();
  const now = useNow();
  const summary = todaySummary(state, now);
  const pending = pendingCount(state);
  const soldOut = state.menus.filter((m) => !m.is_available);

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-6")}>
      <PageHeader title={`สวัสดี ${state.session.name}`} subtitle={`${state.store.name} · ${dateFormat.format(now)}`} />

      {pending > 0 && (
        <Link
          to="/merchant/orders"
          className={cx(
            "flex items-center gap-3 rounded-3xl bg-alert/10 px-4 py-3 font-semibold text-danger ring-1 ring-alert/40 hover:bg-alert/15",
            focusRing,
          )}
        >
          <BellRing aria-hidden="true" className="size-5 shrink-0" />
          <span className="flex-1">มีออเดอร์ใหม่รอรับ {pending} รายการ</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-6">
        <StoreOpenCard />
        <section aria-labelledby="today-title">
          <h2 id="today-title" className="sr-only">
            สรุปวันนี้
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <StatCard
              label="ออเดอร์วันนี้"
              value={summary.orderCount}
              hint={summary.cancelledCount ? `ยกเลิก ${summary.cancelledCount} · รับแล้ว ${summary.completedCount}` : `รับแล้ว ${summary.completedCount}`}
              Icon={ReceiptText}
            />
            <StatCard label="ยอดขายวันนี้" value={formatBaht(summary.revenue)} hint="ไม่รวมออเดอร์ที่ยกเลิก" Icon={Wallet} highlight />
            <StatCard label="คิวที่กำลังทำ" value={summary.inKitchen} hint="รอรับ + กำลังทำ" Icon={ChefHat} />
            <StatCard label="รอลูกค้ามารับ" value={summary.readyCount} hint="เรียกคิวแล้ว" Icon={BellRing} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section aria-labelledby="top-menus-title" className={panelClass}>
          <h2 id="top-menus-title" className="mb-4 text-lg font-bold text-ink">
            เมนูขายดีวันนี้
          </h2>
          <TopMenus items={summary.topMenus} />
        </section>

        <section aria-labelledby="recent-title" className={panelClass}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="recent-title" className="text-lg font-bold text-ink">
              ออเดอร์ล่าสุด
            </h2>
            <Link to="/merchant/orders" className={cx(textLinkClass, "text-sm")}>
              ดูกระดานคิว
            </Link>
          </div>
          <RecentOrders state={state} now={now} />
        </section>
      </div>

      {soldOut.length > 0 && (
        <p className="rounded-3xl bg-white px-4 py-3 text-sm text-ink-soft ring-1 ring-haze">
          ปิดขายอยู่ {soldOut.length} เมนู: {soldOut.map((m) => m.name).join(", ")} ·{" "}
          <Link to="/merchant/menu" className={textLinkClass}>
            จัดการเมนู
          </Link>
        </p>
      )}
    </div>
  );
}

export default Dashboard;
