import { Ban, CheckCircle2, Power, ReceiptText, Wallet, XCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { PageHeader } from "@/features/customer/components/page-header";
import { StoreStatusBadge } from "@/features/admin/components/badges";
import { DataList } from "@/features/admin/components/data-list";
import { ReasonDialog } from "@/features/admin/components/reason-dialog";
import { formatBaht, formatDate, formatDateTime, formatPercent } from "@/features/admin/format";
import { byId, storeStats } from "@/features/admin/stats";
import { actions, useAdmin } from "@/features/admin/store";
import { categoryLabel } from "@/features/merchant/constants";
import { StatCard } from "@/features/merchant/components/stat-card";
import { OrderStatusBadge } from "@/features/merchant/components/status-badge";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

/** การกระทำแต่ละแบบ: ข้อความใน pop-up และสถานะที่จะเปลี่ยนไป */
const DIALOGS = {
  approve: { title: "อนุมัติร้าน", confirm: "อนุมัติ", status: "active", danger: false, requireReason: false, description: "ลูกค้าจะเห็นร้านนี้ในแอปและเริ่มสั่งอาหารได้" },
  reject: { title: "ไม่อนุมัติร้าน", confirm: "ไม่อนุมัติ", status: "rejected", description: "ร้านจะไม่แสดงในแอป เจ้าของร้านจะเห็นเหตุผลที่ระบุ" },
  suspend: { title: "ระงับร้าน", confirm: "ระงับร้าน", status: "suspended", description: "ร้านจะถูกปิดและซ่อนจากลูกค้าทันที ออเดอร์ที่ค้างอยู่ยังต้องดูแลต่อ" },
  activate: { title: "ยกเลิกระงับร้าน", confirm: "ยกเลิกระงับ", status: "active", danger: false, requireReason: false, description: "ร้านกลับมาใช้งานได้ (ยังปิดอยู่จนกว่าร้านจะกดเปิดเอง)" },
  forceClose: { title: "บังคับปิดร้าน", confirm: "ปิดร้านตอนนี้", description: "ร้านจะปิดรับออเดอร์ใหม่ทันที ร้านเปิดเองได้อีกครั้งเมื่อพร้อม" },
};

function StoreEditForm({ store, onSave }) {
  const [address, setAddress] = useState(store.address?.detail ?? "");
  const [maxQueue, setMaxQueue] = useState(String(store.queue?.max_queue ?? ""));
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const errors = {};
  if (!address.trim()) errors.address = "กรอกจุดรับอาหาร";
  if (!/^\d+$/.test(maxQueue) || Number(maxQueue) < 1 || Number(maxQueue) > 200) errors.maxQueue = "ต้องเป็นตัวเลข 1–200";
  const shown = submitted ? errors : {};

  function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    onSave(address.trim(), Number(maxQueue));
    setSaved(true);
    setSubmitted(false);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-ink-soft">ข้อมูลที่ร้านแก้เองไม่ได้ ผู้ดูแลแก้แทนได้ที่นี่</p>
      <TextField
        id="store-address"
        label="จุดรับอาหาร"
        value={address}
        error={shown.address}
        onChange={(e) => {
          setAddress(e.target.value);
          setSaved(false);
        }}
      />
      <TextField
        id="store-max-queue"
        label="จำนวนคิวสูงสุด"
        inputMode="numeric"
        value={maxQueue}
        error={shown.maxQueue}
        hint="ลูกค้าสั่งไม่ได้เมื่อคิวในครัวครบจำนวนนี้"
        trailing={<span className="pr-4 text-sm font-medium text-ink-soft">คิว</span>}
        onChange={(e) => {
          setMaxQueue(e.target.value.replace(/\D/g, ""));
          setSaved(false);
        }}
      />
      {saved && <Alert tone="success" title="บันทึกข้อมูลร้านแล้ว" />}
      <Button type="submit" variant="cocoa" size="md">
        บันทึก
      </Button>
    </form>
  );
}

function StoreDetail() {
  const { id } = useParams();
  const { state, dispatch } = useAdmin();
  const now = useNow();
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const store = byId(state.stores, id);
  usePageTitle(store ? store.name : "ไม่พบร้าน");

  if (!store) {
    return (
      <div className={pageClass}>
        <PageHeader title="ไม่พบร้าน" fallback="/admin/stores" />
        <div className={cx(panelClass, "space-y-4 text-center")}>
          <p className="text-ink-soft">ไม่มีร้าน “{id}” ในระบบ</p>
          <Link to="/admin/stores" className={buttonClasses({ variant: "cocoa", size: "md" })}>
            กลับไปรายการร้าน
          </Link>
        </div>
      </div>
    );
  }

  const owner = byId(state.users, store.owner_id);
  const stats = storeStats(state, store._id, now);
  const menus = state.menus.filter((m) => m.store_id === store._id);
  const recent = state.orders.filter((o) => o.store_id === store._id).slice(0, 10);
  const config = dialog && DIALOGS[dialog];

  function confirm(reason) {
    if (dialog === "forceClose") dispatch(actions.forceCloseStore(store._id, reason));
    else dispatch(actions.setStoreStatus(store._id, config.status, reason));
    setNotice(`${config.title} “${store.name}” แล้ว`);
    setDialog(null);
  }

  const actionButtons = {
    pending: [
      { key: "approve", label: "อนุมัติร้าน", Icon: CheckCircle2, variant: "cocoa" },
      { key: "reject", label: "ไม่อนุมัติ", Icon: XCircle, variant: "danger-outline" },
    ],
    rejected: [{ key: "approve", label: "อนุมัติร้าน", Icon: CheckCircle2, variant: "cocoa" }],
    active: [
      ...(store.is_open ? [{ key: "forceClose", label: "บังคับปิดร้าน", Icon: Power, variant: "cocoa-outline" }] : []),
      { key: "suspend", label: "ระงับร้าน", Icon: Ban, variant: "danger-outline" },
    ],
    suspended: [{ key: "activate", label: "ยกเลิกระงับ", Icon: CheckCircle2, variant: "cocoa" }],
  }[store.status];

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader
        title={store.name}
        subtitle={`${store.category} · สมัครเมื่อ ${formatDate(store.created_at)}`}
        fallback="/admin/stores"
        action={<StoreStatusBadge store={store} />}
      />

      <p role="status" className={notice ? "rounded-2xl bg-mint px-4 py-2 text-sm font-medium text-ink" : "sr-only"}>
        {notice}
      </p>
      {store.status_note && store.status !== "active" && (
        <Alert tone="error" title={store.status === "pending" ? "หมายเหตุ" : `เหตุผลที่${store.status === "rejected" ? "ไม่อนุมัติ" : "ระงับ"}`}>
          {store.status_note}
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {actionButtons.map((a) => (
          <Button key={a.key} variant={a.variant} size="md" onClick={() => setDialog(a.key)}>
            <a.Icon aria-hidden="true" className="size-4" />
            {a.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="ออเดอร์วันนี้" value={stats.todayOrders} Icon={ReceiptText} />
        <StatCard label="ยอดขายเดือนนี้" value={formatBaht(stats.monthRevenue)} Icon={Wallet} highlight />
        <StatCard label="อัตรายกเลิก" value={formatPercent(stats.cancelRate)} hint={`30 วันล่าสุด (${stats.last30Orders} ออเดอร์)`} Icon={Ban} />
        <StatCard label="ยอดเฉลี่ยต่อออเดอร์" value={formatBaht(stats.averageOrder)} hint="30 วันล่าสุด" Icon={ReceiptText} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <section aria-labelledby="store-info-title" className={panelClass}>
          <h2 id="store-info-title" className="mb-3 text-lg font-bold text-ink">
            ข้อมูลร้าน
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-soft">เจ้าของ</dt>
              <dd>
                {owner ? (
                  <Link to={`/admin/users/${owner._id}`} className={textLinkClass}>
                    {owner.name}
                  </Link>
                ) : (
                  "–"
                )}
                {owner && <span className="block text-xs break-all text-ink-soft">{owner.email}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">เบอร์ร้าน</dt>
              <dd className="text-ink">{store.phone || "–"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">เวลาเปิด-ปิด</dt>
              <dd className="text-ink">
                {store.opening_hours.open_time}–{store.opening_hours.close_time} น.
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">คะแนน</dt>
              <dd className="text-ink">{store.rating.count ? `★ ${store.rating.average.toFixed(1)} (${store.rating.count} รีวิว)` : "ยังไม่มีรีวิว"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-ink-soft">จุดรับอาหาร</dt>
              <dd className="text-ink">{store.address?.detail || "–"}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="store-edit-title" className={panelClass}>
          <h2 id="store-edit-title" className="mb-3 text-lg font-bold text-ink">
            แก้ข้อมูลร้าน
          </h2>
          <StoreEditForm
            key={store._id}
            store={store}
            onSave={(address, maxQueue) => dispatch(actions.updateStore(store._id, address, maxQueue))}
          />
        </section>
      </div>

      <section aria-labelledby="store-menus-title" className="space-y-3">
        <h2 id="store-menus-title" className="text-lg font-bold text-ink">
          เมนูทั้งหมด ({menus.length})
        </h2>
        <DataList
          label="เมนูของร้าน"
          pageSize={50}
          rows={menus}
          empty="ร้านนี้ยังไม่มีเมนู"
          columns={[
            { key: "name", header: "เมนู", primary: true, render: (m) => m.name },
            { key: "category", header: "หมวด", render: (m) => categoryLabel(m.category) },
            { key: "price", header: "ราคา", className: "text-right tabular-nums", render: (m) => formatBaht(m.price) },
            {
              key: "available",
              header: "สถานะ",
              render: (m) => (m.is_available ? <span className="text-brand-ink">มีขาย</span> : <span className="text-danger">หมด</span>),
            },
          ]}
        />
      </section>

      <section aria-labelledby="store-orders-title" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="store-orders-title" className="text-lg font-bold text-ink">
            ออเดอร์ล่าสุด
          </h2>
          <Link to={`/admin/orders?store=${store._id}`} className={cx(textLinkClass, "text-sm")}>
            ดูทั้งหมด
          </Link>
        </div>
        <DataList
          label="ออเดอร์ล่าสุดของร้าน"
          rows={recent}
          empty="ยังไม่มีออเดอร์"
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
            { key: "customer", header: "ลูกค้า", render: (o) => byId(state.users, o.customer_id)?.name ?? "–" },
            { key: "total", header: "ยอด", className: "text-right tabular-nums", render: (o) => formatBaht(o.total_price) },
            { key: "status", header: "สถานะ", render: (o) => <OrderStatusBadge status={o.status} /> },
            { key: "time", header: "เวลา", render: (o) => formatDateTime(o.order_date) },
          ]}
        />
      </section>

      {config && (
        <ReasonDialog
          title={config.title}
          subtitle={store.name}
          description={config.description}
          confirmLabel={config.confirm}
          danger={config.danger ?? true}
          requireReason={config.requireReason ?? true}
          reasonLabel={config.requireReason === false ? "หมายเหตุ" : "เหตุผล"}
          onConfirm={confirm}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

export default StoreDetail;
