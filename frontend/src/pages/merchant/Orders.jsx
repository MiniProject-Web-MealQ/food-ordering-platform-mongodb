import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { OrderBoard } from "@/features/merchant/components/order-board";
import { formatQueue } from "@/features/merchant/format";
import { boardOrders, inKitchenCount, isQueueFull, matchesOrderSearch, queueFor } from "@/features/merchant/orders";
import { ORDER_STATUS_LABEL } from "@/features/merchant/status";
import { actions, useMerchant } from "@/features/merchant/store";
import { fieldClass, pageClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function Orders() {
  usePageTitle("ออเดอร์ร้านค้า");
  const { state, dispatch } = useMerchant();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const all = boardOrders(state, now);
  const entries = all.filter((entry) => matchesOrderSearch(entry, query));
  const full = isQueueFull(state);
  const canSimulate = state.store.is_open && !full;

  function advance(order, step) {
    dispatch(actions.advance(order._id));
    const queue = queueFor(state, order._id);
    setNotice(`คิว ${formatQueue(queue.queue_number)} → ${ORDER_STATUS_LABEL[step.status]}`);
  }

  function simulate() {
    const action = actions.simulateOrder(state);
    if (!action) {
      setNotice("ไม่มีเมนูที่เปิดขายอยู่ จึงจำลองออเดอร์ไม่ได้");
      return;
    }
    dispatch(action);
    setNotice(`ออเดอร์ใหม่ คิว ${formatQueue(action.queue.queue_number)} เข้ามาที่ “รอรับ”`);
  }

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader
        title="กระดานคิว"
        subtitle={`อยู่ในครัว ${inKitchenCount(state)}/${state.store.queue.max_queue} คิว`}
        action={
          // MOCK: stands in for "order:new" socket events until customers order through the API.
          <button
            type="button"
            onClick={simulate}
            disabled={!canSimulate}
            className={cx(buttonClasses({ variant: "cocoa-outline", size: "sm" }), "mt-1 disabled:opacity-50")}
          >
            <Plus aria-hidden="true" className="size-4" />
            <span className="max-sm:sr-only">จำลองออเดอร์ใหม่</span>
            <span aria-hidden="true" className="sm:hidden">
              จำลอง
            </span>
          </button>
        }
      />

      {!state.store.is_open && (
        <p className="rounded-3xl bg-haze px-4 py-3 text-sm text-ink">
          ร้านปิดรับออเดอร์อยู่ ลูกค้าจะสั่งใหม่ไม่ได้ ·{" "}
          <Link to="/merchant/dashboard" className={textLinkClass}>
            เปิดร้าน
          </Link>
        </p>
      )}
      {state.store.is_open && full && (
        <p className="rounded-3xl bg-alert/10 px-4 py-3 text-sm font-medium text-danger">
          คิวเต็มแล้ว ({state.store.queue.max_queue} คิว) ลูกค้าจะสั่งเพิ่มได้เมื่อมีคิวว่าง
        </p>
      )}

      <div className="relative lg:max-w-md">
        <label htmlFor="order-search" className="sr-only">
          ค้นหาออเดอร์
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
        <input
          id="order-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาเลขคิว ชื่อลูกค้า หรือเมนู"
          className={cx(fieldClass, "rounded-full pl-12")}
        />
      </div>

      <p role="status" className={cx("text-sm", notice ? "rounded-2xl bg-mint px-4 py-2 font-medium text-ink" : "sr-only")}>
        {notice}
      </p>

      {query && entries.length === 0 ? (
        <p className="rounded-3xl bg-white px-5 py-8 text-center text-sm text-ink-soft ring-1 ring-haze">
          ไม่พบออเดอร์ที่ตรงกับ “{query}” จากทั้งหมด {all.length} ออเดอร์
        </p>
      ) : (
        <OrderBoard entries={entries} now={now} onAdvance={advance} />
      )}
    </div>
  );
}

export default Orders;
