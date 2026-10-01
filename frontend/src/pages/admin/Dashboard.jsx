import { AlertTriangle, Ban, Clock, ReceiptText, Store, UserPlus, Users, Wallet } from "lucide-react";
import { Link } from "react-router";
import { focusRing, textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { BarChart } from "@/features/admin/components/bar-chart";
import { formatBaht, formatClock, formatPercent, formatWeekday } from "@/features/admin/format";
import { attention, byId, dailySeries, menuRanking, storeRanking, todayStats, totals } from "@/features/admin/stats";
import { useAdmin } from "@/features/admin/store";
import { StatCard } from "@/features/merchant/components/stat-card";
import { formatElapsed } from "@/features/merchant/format";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const longDate = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long" });

function RankList({ rows, render, empty }) {
  const most = rows[0]?.value ?? 0;
  if (rows.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <ol className="space-y-3">
      {rows.map((row, i) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <p className="min-w-0 truncate font-semibold text-ink">
              <span className="mr-2 text-cocoa">{i + 1}.</span>
              {render(row)}
            </p>
            <p className="shrink-0 text-ink-soft tabular-nums">{row.caption}</p>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-haze">
            <div className="h-full rounded-full bg-cocoa" style={{ width: `${most ? (row.value / most) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function AttentionGroup({ title, count, children }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
        {title}
        <span className={cx("rounded-full px-2 text-xs", count ? "bg-alert/15 text-danger" : "bg-haze text-ink-soft")}>{count}</span>
      </h3>
      {children}
    </section>
  );
}

function Dashboard() {
  usePageTitle("ภาพรวมระบบ");
  const { state } = useAdmin();
  const now = useNow();
  const today = todayStats(state, now);
  const total = totals(state, now);
  const series = dailySeries(state, now, 7);
  const topStores = storeRanking(state, now - WEEK).slice(0, 5);
  const topMenus = menuRanking(state, now - WEEK).slice(0, 5);
  const todo = attention(state, now);
  const todoCount = todo.pendingStores.length + todo.stuckOrders.length + todo.highCancel.length;

  return (
    <div className={cx(pageClass, "space-y-5 lg:space-y-6")}>
      <PageHeader title="ภาพรวมระบบ" subtitle={`ข้อมูล ณ ${longDate.format(now)} · ${formatClock(now)} น.`} />

      <section aria-labelledby="today-title" className="space-y-3">
        <h2 id="today-title" className="text-lg font-bold text-ink">
          วันนี้
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard label="ออเดอร์ทั้งหมด" value={today.orderCount.toLocaleString("th-TH")} hint="ทุกร้าน" Icon={ReceiptText} />
          <StatCard label="ยอดขายรวมทุกร้าน" value={formatBaht(today.revenue)} hint="ไม่รวมที่ยกเลิก" Icon={Wallet} highlight />
          <StatCard label="ออเดอร์ที่ยกเลิก" value={today.cancelled} hint={today.orderCount ? `${formatPercent(today.cancelled / today.orderCount)} ของวันนี้` : "–"} Icon={Ban} />
          <StatCard label="คิวที่ค้างอยู่ทั้งระบบ" value={today.backlog} hint="รอรับ + กำลังทำ + รอลูกค้ามารับ" Icon={Clock} />
        </div>
      </section>

      <section aria-labelledby="totals-title" className="space-y-3">
        <h2 id="totals-title" className="text-lg font-bold text-ink">
          สะสม
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label="ร้านที่เปิดอยู่"
            value={`${total.open} / ${total.stores}`}
            hint={`ปิด ${total.closed} · ระงับ ${total.suspended} · รออนุมัติ ${total.pending}`}
            Icon={Store}
          />
          <StatCard label="ลูกค้าทั้งหมด" value={total.customers.toLocaleString("th-TH")} hint="บัญชีลูกค้า" Icon={Users} />
          <StatCard label="ลูกค้าใหม่" value={total.newCustomers} hint="สมัครใน 7 วันล่าสุด" Icon={UserPlus} />
          <StatCard label="ร้านค้าใหม่" value={total.newMerchants} hint="สมัครใน 7 วันล่าสุด" Icon={UserPlus} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section className={cx(panelClass, "min-w-0")}>
          <BarChart
            title="ยอดขาย 7 วันล่าสุด"
            valueHeader="ยอดขาย"
            formatValue={formatBaht}
            data={series.map((d) => ({ key: d.date, label: formatWeekday(d.date), sublabel: String(new Date(d.date).getDate()), longLabel: longDate.format(d.date), value: d.revenue }))}
          />
        </section>
        <section className={cx(panelClass, "min-w-0")}>
          <BarChart
            title="จำนวนออเดอร์ 7 วันล่าสุด"
            valueHeader="ออเดอร์"
            formatValue={(v) => v.toLocaleString("th-TH")}
            data={series.map((d) => ({ key: d.date, label: formatWeekday(d.date), sublabel: String(new Date(d.date).getDate()), longLabel: longDate.format(d.date), value: d.orders }))}
          />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section aria-labelledby="top-stores-title" className={cx(panelClass, "min-w-0")}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="top-stores-title" className="text-lg font-bold text-ink">
              5 ร้านขายดี
            </h2>
            <span className="text-xs text-ink-soft">7 วันล่าสุด</span>
          </div>
          <RankList
            empty="ยังไม่มียอดขาย"
            rows={topStores.map((r) => ({ key: r.storeId, value: r.revenue, caption: `${formatBaht(r.revenue)} · ${r.orders} ออเดอร์`, store: r.store }))}
            render={(row) => (
              <Link to={`/admin/stores/${row.key}`} className={cx("rounded underline-offset-4 hover:underline", focusRing)}>
                {row.store?.name ?? row.key}
              </Link>
            )}
          />
        </section>
        <section aria-labelledby="top-menus-title" className={cx(panelClass, "min-w-0")}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="top-menus-title" className="text-lg font-bold text-ink">
              5 เมนูขายดีทั้งระบบ
            </h2>
            <span className="text-xs text-ink-soft">7 วันล่าสุด</span>
          </div>
          <RankList
            empty="ยังไม่มียอดขาย"
            rows={topMenus.map((r) => ({ key: r.menuId, value: r.quantity, caption: `${r.quantity} ที่`, name: r.name, storeName: r.store?.name }))}
            render={(row) => (
              <>
                {row.name} <span className="font-normal text-ink-soft">· {row.storeName}</span>
              </>
            )}
          />
        </section>
      </div>

      <section aria-labelledby="todo-title" className={cx(panelClass, "min-w-0 space-y-4")}>
        <h2 id="todo-title" className="flex items-center gap-2 text-lg font-bold text-ink">
          <AlertTriangle aria-hidden="true" className="size-5 text-amber" />
          สิ่งที่ต้องดูแล
          <span className="text-sm font-normal text-ink-soft">({todoCount} รายการ)</span>
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <AttentionGroup title="ร้านรออนุมัติ" count={todo.pendingStores.length}>
            {todo.pendingStores.length === 0 ? (
              <p className="text-sm text-ink-soft">ไม่มีร้านรออนุมัติ</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {todo.pendingStores.map((s) => (
                  <li key={s._id}>
                    <Link to={`/admin/stores/${s._id}`} className={textLinkClass}>
                      {s.name}
                    </Link>
                    <span className="text-ink-soft"> · {s.category}</span>
                  </li>
                ))}
              </ul>
            )}
          </AttentionGroup>
          <AttentionGroup title="ออเดอร์ค้างเกิน 30 นาที" count={todo.stuckOrders.length}>
            {todo.stuckOrders.length === 0 ? (
              <p className="text-sm text-ink-soft">ไม่มีออเดอร์ค้าง</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {todo.stuckOrders.slice(0, 6).map((o) => (
                  <li key={o._id}>
                    <Link to={`/admin/orders/${o.order_number}`} className={textLinkClass}>
                      {o.order_number}
                    </Link>
                    <span className="text-ink-soft">
                      {" "}
                      · {byId(state.stores, o.store_id)?.name} · ค้าง {formatElapsed(o.order_date, now)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AttentionGroup>
          <AttentionGroup title="ร้านที่ยกเลิกบ่อย (≥15% ใน 7 วัน)" count={todo.highCancel.length}>
            {todo.highCancel.length === 0 ? (
              <p className="text-sm text-ink-soft">ไม่มีร้านที่ยกเลิกบ่อย</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {todo.highCancel.map((r) => (
                  <li key={r.storeId}>
                    <Link to={`/admin/stores/${r.storeId}`} className={textLinkClass}>
                      {r.store?.name}
                    </Link>
                    <span className="text-ink-soft">
                      {" "}
                      · ยกเลิก {r.cancelled}/{r.orders} ({formatPercent(r.cancelRate)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AttentionGroup>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
