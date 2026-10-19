import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { focusRing, textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { PromotionStateBadge } from "@/features/admin/components/badges";
import { DataList } from "@/features/admin/components/data-list";
import { FilterRow, SearchField, SelectField } from "@/features/admin/components/fields";
import { PromotionForm } from "@/features/admin/components/promotion-form";
import { formatBaht, formatDate, formatDateTime, formatDiscount } from "@/features/admin/format";
import { PROMOTION_STATE_LABEL } from "@/features/admin/labels";
import { emptyPromotionValues, promotionToValues } from "@/features/admin/promotion-form";
import { byId, promotionState } from "@/features/admin/stats";
import { actions, useAdmin } from "@/features/admin/store";
import { StatCard } from "@/features/merchant/components/stat-card";
import { MerchantDialog } from "@/features/merchant/components/merchant-dialog";
import { pageClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function UsageDialog({ promo, state, onEdit, onClose }) {
  const orders = state.orders.filter((o) => o.promotion?.code === promo.code);
  const totalDiscount = orders.reduce((s, o) => s + o.discount, 0);
  return (
    <MerchantDialog eyebrow="คูปอง" title={promo.code} subtitle={`${promo.title} · ${formatDiscount(promo)}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label="ใช้ไปแล้ว" value={`${promo.used_count}${promo.usage_limit ? ` / ${promo.usage_limit}` : ""}`} hint="ครั้ง" />
          <StatCard label="ส่วนลดที่ให้ไป" value={formatBaht(totalDiscount)} hint="จากออเดอร์ 30 วันล่าสุด" highlight />
          <StatCard label="ออเดอร์ที่ใช้" value={orders.length} hint="30 วันล่าสุด" />
        </div>
        <div className="flex justify-end">
          <Button variant="cocoa-outline" size="sm" onClick={onEdit}>
            <Pencil aria-hidden="true" className="size-4" />
            แก้ไขคูปอง
          </Button>
        </div>
        <DataList
          label={`ออเดอร์ที่ใช้คูปอง ${promo.code}`}
          rows={orders}
          pageSize={10}
          empty="ยังไม่มีออเดอร์ที่ใช้คูปองนี้"
          columns={[
            {
              key: "number",
              header: "ออเดอร์",
              primary: true,
              render: (o) => (
                <Link to={`/admin/orders/${o.order_number}`} className={textLinkClass}>
                  {o.order_number}
                </Link>
              ),
            },
            { key: "store", header: "ร้าน", render: (o) => byId(state.stores, o.store_id)?.name ?? "–" },
            { key: "discount", header: "ส่วนลด", className: "text-right tabular-nums", render: (o) => formatBaht(o.discount) },
            { key: "time", header: "เวลา", render: (o) => formatDateTime(o.order_date) },
          ]}
        />
      </div>
    </MerchantDialog>
  );
}

function Promotions() {
  usePageTitle("คูปองส่วนลด");
  const { state, dispatch } = useAdmin();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [dialog, setDialog] = useState(null); // { mode: "new" | "edit" | "usage", id? }
  const [notice, setNotice] = useState("");

  const liveStores = state.stores.filter((s) => s.status === "active");
  const q = query.trim().toLowerCase();
  const rows = state.promotions
    .filter((p) => stateFilter === "all" || promotionState(p, now) === stateFilter)
    .filter((p) => !q || p.code.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
  const editing = dialog?.id ? state.promotions.find((p) => p._id === dialog.id) : null;

  const columns = [
    {
      key: "code",
      header: "โค้ด",
      primary: true,
      render: (p) => (
        <button
          type="button"
          onClick={() => setDialog({ mode: "usage", id: p._id })}
          className={cx("rounded font-mono font-bold text-brand-ink underline-offset-4 hover:underline", focusRing)}
        >
          {p.code}
        </button>
      ),
    },
    { key: "title", header: "ชื่อ", render: (p) => p.title },
    { key: "discount", header: "ส่วนลด", render: (p) => formatDiscount(p) },
    { key: "min", header: "ขั้นต่ำ", className: "tabular-nums", render: (p) => (p.minimum_order ? formatBaht(p.minimum_order) : "–") },
    { key: "dates", header: "ช่วงวันที่", render: (p) => `${formatDate(p.start_date)} – ${formatDate(p.expire_date)}` },
    { key: "used", header: "ใช้ไป/จำกัด", className: "tabular-nums", render: (p) => `${p.used_count} / ${p.usage_limit ?? "∞"}` },
    { key: "scope", header: "ใช้กับ", render: (p) => (p.store_id ? byId(state.stores, p.store_id)?.name ?? p.store_id : "ทุกร้าน") },
    { key: "state", header: "สถานะ", render: (p) => <PromotionStateBadge state={promotionState(p, now)} /> },
    {
      key: "toggle",
      header: "เปิด/ปิด",
      render: (p) => (
        <ToggleSwitch
          id={`promo-toggle-${p._id}`}
          label={<span className="sr-only">เปิดใช้คูปอง {p.code}</span>}
          checked={p.is_active}
          onChange={async (checked) => {
            const result = await dispatch(actions.updatePromotion(p._id, { is_active: checked }));
            if (!result.ok) return;
            setNotice(checked ? `เปิดใช้คูปอง ${p.code} แล้ว` : `ปิดคูปอง ${p.code} แล้ว`);
          }}
        />
      ),
    },
  ];

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader
        title="คูปองส่วนลด"
        subtitle={`ทั้งหมด ${state.promotions.length} คูปอง · กดที่โค้ดเพื่อดูว่าใช้กับออเดอร์ไหนบ้าง`}
        action={
          <Button variant="cocoa" size="sm" className="mt-1" onClick={() => setDialog({ mode: "new" })}>
            <Plus aria-hidden="true" className="size-4" />
            สร้างคูปอง
          </Button>
        }
      />
      <p role="status" className={notice ? "rounded-2xl bg-mint px-4 py-2 text-sm font-medium text-ink" : "sr-only"}>
        {notice}
      </p>
      <FilterRow>
        <SearchField id="promo-search" label="ค้นหาคูปอง" value={query} onChange={setQuery} placeholder="ค้นหาโค้ดหรือชื่อคูปอง" />
        <SelectField
          id="promo-state"
          label="สถานะ"
          value={stateFilter}
          onChange={setStateFilter}
          options={[{ value: "all", label: "ทุกสถานะ" }, ...Object.entries(PROMOTION_STATE_LABEL).map(([value, label]) => ({ value, label }))]}
        />
      </FilterRow>
      <DataList label="รายการคูปอง" columns={columns} rows={rows} empty="ไม่พบคูปองที่ตรงกับตัวกรอง" />

      {dialog?.mode === "new" && (
        <MerchantDialog eyebrow="คูปอง" title="สร้างคูปอง" onClose={() => setDialog(null)}>
          <PromotionForm
            initialValues={emptyPromotionValues(now)}
            promotions={state.promotions}
            stores={liveStores}
            submitLabel="สร้างคูปอง"
            onCancel={() => setDialog(null)}
            onSubmit={async (fields) => {
              const result = await dispatch(actions.addPromotion(fields));
              if (!result.ok) return result;
              setNotice(`สร้างคูปอง ${fields.code} แล้ว`);
              setDialog(null);
              return result;
            }}
          />
        </MerchantDialog>
      )}
      {dialog?.mode === "edit" && editing && (
        <MerchantDialog eyebrow="คูปอง" title="แก้ไขคูปอง" subtitle={editing.code} onClose={() => setDialog(null)}>
          <PromotionForm
            key={editing._id}
            initialValues={promotionToValues(editing)}
            promotions={state.promotions}
            stores={liveStores}
            editingId={editing._id}
            submitLabel="บันทึกการแก้ไข"
            onCancel={() => setDialog(null)}
            onSubmit={async (fields) => {
              const result = await dispatch(actions.updatePromotion(editing._id, fields));
              if (!result.ok) return result;
              setNotice(`บันทึกคูปอง ${fields.code} แล้ว`);
              setDialog(null);
              return result;
            }}
          />
        </MerchantDialog>
      )}
      {dialog?.mode === "usage" && editing && (
        <UsageDialog promo={editing} state={state} onClose={() => setDialog(null)} onEdit={() => setDialog({ mode: "edit", id: editing._id })} />
      )}
    </div>
  );
}

export default Promotions;
