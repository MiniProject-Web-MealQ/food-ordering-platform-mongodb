import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { DataList } from "@/features/admin/components/data-list";
import { DateField, FilterRow, SearchField, SelectField } from "@/features/admin/components/fields";
import { formatBaht, formatDateTime, fromDateInput } from "@/features/admin/format";
import { byId, isSale } from "@/features/admin/stats";
import { useAdmin } from "@/features/admin/store";
import { OrderStatusBadge } from "@/features/merchant/components/status-badge";
import { paymentLabel } from "@/features/merchant/format";
import { ORDER_STATUS_LABEL } from "@/features/merchant/status";
import { pageClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const AMOUNT_OPTIONS = [
  { value: "all", label: "ทุกยอด" },
  { value: "lt100", label: "ไม่เกิน ฿100" },
  { value: "100to200", label: "฿100–200" },
  { value: "gt200", label: "มากกว่า ฿200" },
];

function inAmount(total, range) {
  if (range === "lt100") return total <= 100;
  if (range === "100to200") return total > 100 && total <= 200;
  if (range === "gt200") return total > 200;
  return true;
}

function Orders() {
  usePageTitle("ออเดอร์ทั้งระบบ");
  const { state } = useAdmin();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  // ลิงก์ "ดูทั้งหมด" จากหน้ารายละเอียดร้านส่ง ?store=<id> มา
  const [store, setStore] = useState(() => searchParams.get("store") ?? "all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("all");

  const q = query.trim().toLowerCase();
  const fromTs = fromDateInput(from);
  const toTs = fromDateInput(to, true);
  const rows = state.orders.filter((o) => {
    if (store !== "all" && o.store_id !== store) return false;
    if (status !== "all" && o.status !== status) return false;
    if (fromTs && o.order_date < fromTs) return false;
    if (toTs && o.order_date > toTs) return false;
    if (!inAmount(o.total_price, amount)) return false;
    if (!q) return true;
    return o.order_number.toLowerCase().includes(q) || (byId(state.users, o.customer_id)?.name ?? "").toLowerCase().includes(q);
  });
  const filtered = store !== "all" || status !== "all" || from || to || amount !== "all" || q;
  const sum = rows.filter(isSale).reduce((s, o) => s + o.total_price, 0);

  function clear() {
    setQuery("");
    setStore("all");
    setStatus("all");
    setFrom("");
    setTo("");
    setAmount("all");
  }

  const columns = [
    {
      key: "number",
      header: "เลขออเดอร์",
      primary: true,
      render: (o) => (
        <Link to={`/admin/orders/${o.order_number}`} className={textLinkClass}>
          {o.order_number}
        </Link>
      ),
    },
    { key: "store", header: "ร้าน", render: (o) => byId(state.stores, o.store_id)?.name ?? "–" },
    { key: "customer", header: "ลูกค้า", render: (o) => byId(state.users, o.customer_id)?.name ?? "–" },
    { key: "total", header: "ยอด", className: "text-right tabular-nums", render: (o) => formatBaht(o.total_price) },
    { key: "payment", header: "วิธีจ่าย", render: (o) => paymentLabel(o.payment_method) },
    {
      key: "status",
      header: "สถานะ",
      render: (o) => (
        <span className="flex flex-wrap items-center gap-1">
          <OrderStatusBadge status={o.status} />
          {o.refund && <span className="text-xs text-ink-soft">คืนเงินแล้ว</span>}
        </span>
      ),
    },
    { key: "time", header: "เวลา", render: (o) => formatDateTime(o.order_date) },
  ];

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader title="ออเดอร์ทั้งระบบ" subtitle={`ทั้งหมด ${state.orders.length.toLocaleString("th-TH")} ออเดอร์ (30 วันล่าสุด)`} />
      <FilterRow>
        <SearchField id="order-search" label="ค้นหาออเดอร์" value={query} onChange={setQuery} placeholder="เลขออเดอร์หรือชื่อลูกค้า" />
        <SelectField
          id="order-store"
          label="ร้าน"
          value={store}
          onChange={setStore}
          options={[
            { value: "all", label: "ทุกร้าน" },
            ...state.stores.filter((s) => s.status !== "pending").map((s) => ({ value: s._id, label: s.name })),
          ]}
        />
        <SelectField
          id="order-status"
          label="สถานะ"
          value={status}
          onChange={setStatus}
          options={[{ value: "all", label: "ทุกสถานะ" }, ...Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => ({ value, label }))]}
        />
        <DateField id="order-from" label="ตั้งแต่วันที่" value={from} onChange={setFrom} />
        <DateField id="order-to" label="ถึงวันที่" value={to} onChange={setTo} />
        <SelectField id="order-amount" label="ยอดเงิน" value={amount} onChange={setAmount} options={AMOUNT_OPTIONS} />
      </FilterRow>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-haze">
        <p className="text-ink">
          พบ <span className="font-bold">{rows.length.toLocaleString("th-TH")}</span> ออเดอร์ · ยอดขาย (ไม่รวมยกเลิก){" "}
          <span className="font-bold">{formatBaht(sum)}</span>
        </p>
        {filtered && (
          <button type="button" onClick={clear} className={buttonClasses({ variant: "cocoa-outline", size: "sm" })}>
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <DataList label="รายการออเดอร์" columns={columns} rows={rows} empty="ไม่พบออเดอร์ที่ตรงกับตัวกรอง" />
    </div>
  );
}

export default Orders;
