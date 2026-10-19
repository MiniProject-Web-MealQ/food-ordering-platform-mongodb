import { useState } from "react";
import { Link } from "react-router";
import { textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { StoreStatusBadge } from "@/features/admin/components/badges";
import { DataList } from "@/features/admin/components/data-list";
import { FilterRow, SearchField, SelectField } from "@/features/admin/components/fields";
import { formatBaht } from "@/features/admin/format";
import { byId, isSale, startOfDay, startOfMonth } from "@/features/admin/stats";
import { useAdmin } from "@/features/admin/store";
import { pageClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "open", label: "เปิดอยู่" },
  { value: "closed", label: "ปิดอยู่" },
  { value: "suspended", label: "ถูกระงับ" },
  { value: "pending", label: "รออนุมัติ" },
  { value: "rejected", label: "ไม่อนุมัติ" },
];

function matchesStatus(store, status) {
  if (status === "all") return true;
  if (status === "open") return store.status === "active" && store.is_open;
  if (status === "closed") return store.status === "active" && !store.is_open;
  return store.status === status;
}

function Stores() {
  usePageTitle("จัดการร้านค้า");
  const { state } = useAdmin();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const today = startOfDay(now);
  const month = startOfMonth(now);
  const statsByStore = new Map();
  for (const o of state.orders) {
    const row = statsByStore.get(o.store_id) ?? { today: 0, month: 0 };
    if (o.order_date >= today) row.today += 1;
    if (o.order_date >= month && isSale(o)) row.month += o.total_price;
    statsByStore.set(o.store_id, row);
  }

  const categories = [...new Set(state.stores.map((s) => s.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));
  const q = query.trim().toLowerCase();
  const rows = state.stores
    .filter((s) => matchesStatus(s, status) && (category === "all" || s.category === category))
    .filter((s) => !q || s.name.toLowerCase().includes(q) || (byId(state.users, s.owner_id)?.name ?? "").toLowerCase().includes(q))
    // ร้านรออนุมัติขึ้นก่อน จะได้ไม่ตกหล่น
    .sort((a, b) => (b.status === "pending") - (a.status === "pending") || a.name.localeCompare(b.name, "th"));

  const columns = [
    {
      key: "name",
      header: "ร้าน",
      primary: true,
      render: (s) => (
        <div className="min-w-0">
          <Link to={`/admin/stores/${s._id}`} className={textLinkClass}>
            {s.name}
          </Link>
          <p className="truncate text-xs font-normal text-ink-soft">{s.category}</p>
        </div>
      ),
    },
    { key: "owner", header: "เจ้าของ", render: (s) => byId(state.users, s.owner_id)?.name ?? "–" },
    { key: "status", header: "สถานะ", render: (s) => <StoreStatusBadge store={s} /> },
    { key: "rating", header: "คะแนน", className: "tabular-nums", render: (s) => (s.rating?.count ? `★ ${s.rating.average.toFixed(1)}` : "–") },
    { key: "today", header: "ออเดอร์วันนี้", className: "text-right tabular-nums", render: (s) => statsByStore.get(s._id)?.today ?? 0 },
    { key: "month", header: "ยอดขายเดือนนี้", className: "text-right tabular-nums", render: (s) => formatBaht(statsByStore.get(s._id)?.month ?? 0) },
  ];

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader title="ร้านค้า" subtitle={`ทั้งหมด ${state.stores.length} ร้าน`} />
      <FilterRow>
        <SearchField id="store-search" label="ค้นหาร้าน" value={query} onChange={setQuery} placeholder="ค้นหาชื่อร้านหรือเจ้าของ" />
        <SelectField id="store-status" label="สถานะ" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <SelectField
          id="store-category"
          label="หมวดอาหาร"
          value={category}
          onChange={setCategory}
          options={[{ value: "all", label: "ทุกหมวด" }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
      </FilterRow>
      <DataList label="รายการร้านค้า" columns={columns} rows={rows} empty="ไม่พบร้านที่ตรงกับตัวกรอง" />
    </div>
  );
}

export default Stores;
