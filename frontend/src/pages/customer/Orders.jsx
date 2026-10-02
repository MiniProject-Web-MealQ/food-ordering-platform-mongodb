import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FilterBar } from "@/components/ui/filter-token-bar";
import { buttonClasses } from "@/components/ui/styles";
import { currentStatus, getOrderRestaurant, isActiveOrder } from "@/features/customer/catalog";
import { ActiveOrderCard } from "@/features/customer/components/active-order-card";
import { SegmentedTabs } from "@/features/customer/components/segmented-tabs";
import { formatBaht, formatWhen } from "@/features/customer/format";
import { matchesFilters, orderFilterFields } from "@/features/customer/order-filters";
import { useCustomer } from "@/features/customer/store";
import { containerClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function HistoryCard({ order, onReorder }) {
  const restaurant = getOrderRestaurant(order);
  const cancelled = currentStatus(order) === "CANCELLED";

  return (
    <article className="relative rounded-3xl bg-cream p-4 ring-1 ring-haze">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-ink">
            <Link
              to={`/customer/orders/${order.id}`}
              className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
            >
              {restaurant.name}
            </Link>
          </h3>
          <p className="truncate text-sm text-ink-soft">
            {order.items.map((item) => `${item.qty}× ${item.name}`).join(" · ")}
          </p>
          <p className="text-xs text-ink-soft">
            #{order.id} · {cancelled ? "ยกเลิกแล้ว · " : ""}{formatWhen(order.statusTimes.CANCELLED || order.statusTimes.PICKED_UP || order.statusTimes.PLACED)}
          </p>
        </div>
        <p className="shrink-0 font-bold text-ink">{formatBaht(order.total)}</p>
      </div>
      <div className="relative mt-3 flex gap-2">
        {!cancelled && <Link
          to={`/customer/orders/${order.id}/review`}
          className={buttonClasses({ variant: order.review ? "secondary" : "soft", size: "sm" })}
        >
          {order.review ? `รีวิวแล้ว ★ ${order.review.rating}` : "ให้คะแนน"}
        </Link>}
        <button type="button" onClick={onReorder} className={buttonClasses({ variant: "cocoa-outline", size: "sm" })}>
          สั่งอีกครั้ง
        </button>
      </div>
    </article>
  );
}

function Orders() {
  usePageTitle("ออเดอร์ของฉัน");
  const navigate = useNavigate();
  const { state, dispatch } = useCustomer();
  const active = state.orders.filter(isActiveOrder);
  const history = state.orders.filter((o) => !isActiveOrder(o));
  const [tab, setTab] = useState(active.length > 0 ? "active" : "history");
  const [filters, setFilters] = useState([]);

  const filterFields = useMemo(() => orderFilterFields(history), [history]);
  const shownHistory = history.filter((order) => matchesFilters(order, filters));

  function reorder(order) {
    dispatch({ type: "cart/reorder", order });
    navigate("/customer/cart");
  }

  return (
    <div className={cx(containerClass, "space-y-5 pt-6 pb-8 lg:space-y-8 lg:pt-10 lg:pb-16")}>
      <h1 className="text-3xl font-bold text-ink lg:text-4xl">ออเดอร์ของฉัน</h1>

      <div className="lg:max-w-md">
        <SegmentedTabs
          idPrefix="orders-tab"
          label="ออเดอร์"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "active", label: `กำลังดำเนินการ ${active.length}` },
            { value: "history", label: `ประวัติ ${history.length}` },
          ]}
        />
      </div>

      {tab === "history" && history.length > 0 && (
        <div className="space-y-2">
          <FilterBar
            fields={filterFields}
            value={filters}
            onChange={setFilters}
            aria-label="ตัวกรองประวัติการสั่ง"
          />
          {filters.length > 0 && (
            <p aria-live="polite" className="text-sm text-ink-soft">
              พบ {shownHistory.length} จาก {history.length} ออเดอร์
            </p>
          )}
        </div>
      )}

      <div id="orders-tab-panel" role="tabpanel" aria-labelledby={`orders-tab-${tab}`} className="grid gap-3 md:grid-cols-2 lg:gap-5">
        {tab === "active" && (
          <>
            {active.map((order) => (
              <ActiveOrderCard key={order.id} order={order} variant="list" />
            ))}
            <p className="rounded-3xl bg-cream px-5 py-4 text-sm text-ink-soft md:col-span-2">
              {active.length > 0
                ? "สถานะอัปเดตอัตโนมัติเมื่อร้านรับออเดอร์ ทำอาหาร และยืนยันการรับอาหาร"
                : "ยังไม่มีออเดอร์ที่กำลังดำเนินการ"}
            </p>
          </>
        )}
        {tab === "history" &&
          (shownHistory.length > 0 ? (
            shownHistory.map((order) => (
              <HistoryCard key={order.id} order={order} onReorder={() => reorder(order)} />
            ))
          ) : (
            <p className="rounded-3xl bg-cream px-5 py-4 text-sm text-ink-soft md:col-span-2">
              {history.length > 0 ? "ไม่มีออเดอร์ที่ตรงกับตัวกรอง" : "ยังไม่มีประวัติการสั่ง"}
            </p>
          ))}
      </div>
    </div>
  );
}

export default Orders;
