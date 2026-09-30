import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { OrderBoard } from "@/features/merchant/components/order-board";
import { formatQueue } from "@/features/merchant/format";
import { boardOrders, inKitchenCount, matchesOrderSearch, queueFor } from "@/features/merchant/orders";
import { ORDER_STATUS_LABEL } from "@/features/merchant/status";
import { loadOrders, useMerchant } from "@/features/merchant/store";
import { useMerchantActions } from "@/features/merchant/use-merchant-actions";
import { fieldClass, pageClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function Orders() {
  usePageTitle("ออเดอร์ร้านค้า");
  const { state, dispatch } = useMerchant();
  const { advance: advanceOrder } = useMerchantActions();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const all = boardOrders(state, now);
  const entries = all.filter((entry) => matchesOrderSearch(entry, query));

  async function advance(order, step) {
    if (busyId) return;
    setBusyId(order._id);
    const queueLabel = formatQueue(queueFor(state, order._id)?.queue_number ?? 0);
    const result = await advanceOrder(order);
    setBusyId(null);
    setNotice(
      result.ok
        ? { text: `คิว ${queueLabel} → ${ORDER_STATUS_LABEL[step.status]}` }
        : { text: `อัปเดตคิว ${queueLabel} ไม่สำเร็จ: ${result.error.message}`, error: true },
    );
  }

  async function refresh() {
    setRefreshing(true);
    const action = await loadOrders();
    setRefreshing(false);
    if (action) dispatch(action);
    else setNotice({ text: "โหลดออเดอร์ล่าสุดไม่สำเร็จ ลองใหม่อีกครั้ง", error: true });
  }

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader
        title="กระดานคิว"
        subtitle={`อยู่ในครัว ${inKitchenCount(state)} คิว · ออเดอร์ใหม่เข้ามาเองอัตโนมัติ`}
        action={
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            aria-busy={refreshing}
            className={cx(buttonClasses({ variant: "cocoa-outline", size: "sm" }), "mt-1 disabled:opacity-50")}
          >
            <RefreshCw aria-hidden="true" className={cx("size-4", refreshing && "animate-spin")} />
            <span className="max-sm:sr-only">โหลดล่าสุด</span>
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

      <p
        role="status"
        className={cx(
          "text-sm",
          !notice && "sr-only",
          notice && (notice.error ? "rounded-2xl bg-alert/10 px-4 py-2 font-medium text-danger" : "rounded-2xl bg-mint px-4 py-2 font-medium text-ink"),
        )}
      >
        {notice?.text}
      </p>

      {query && entries.length === 0 ? (
        <p className="rounded-3xl bg-white px-5 py-8 text-center text-sm text-ink-soft ring-1 ring-haze">
          ไม่พบออเดอร์ที่ตรงกับ “{query}” จากทั้งหมด {all.length} ออเดอร์
        </p>
      ) : (
        <OrderBoard entries={entries} now={now} busyId={busyId} onAdvance={advance} />
      )}
    </div>
  );
}

export default Orders;
