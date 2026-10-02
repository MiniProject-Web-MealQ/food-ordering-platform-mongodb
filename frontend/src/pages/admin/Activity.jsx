import { useState } from "react";
import { Link } from "react-router";
import { textLinkClass } from "@/components/ui/styles";
import { PageHeader } from "@/features/customer/components/page-header";
import { DataList } from "@/features/admin/components/data-list";
import { FilterRow, SearchField, SelectField } from "@/features/admin/components/fields";
import { formatDateTime } from "@/features/admin/format";
import { ACTIVITY_LABEL } from "@/features/admin/labels";
import { byId } from "@/features/admin/stats";
import { useAdmin } from "@/features/admin/store";
import { pageClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

/** กลุ่มของการกระทำ ใช้กรอง (ตัดจากคำนำหน้า เช่น "store.suspend" → "store") */
const GROUPS = [
  { value: "all", label: "ทุกเรื่อง" },
  { value: "store", label: "ร้านค้า" },
  { value: "user", label: "ผู้ใช้" },
  { value: "order", label: "ออเดอร์" },
  { value: "promotion", label: "คูปอง" },
  { value: "wallet", label: "Wallet" },
  { value: "settings", label: "ตั้งค่าระบบ" },
];

function targetLink(entry, state) {
  switch (entry.target_type) {
    case "store":
      return `/admin/stores/${entry.target_id}`;
    case "user":
      return `/admin/users/${entry.target_id}`;
    case "order": {
      const order = state.orders.find((o) => o._id === entry.target_id);
      return order ? `/admin/orders/${order.order_number}` : null;
    }
    case "promotion":
      return "/admin/promotions";
    case "settings":
      return "/admin/settings";
    default:
      return null;
  }
}

function Activity() {
  usePageTitle("บันทึกการทำงาน");
  const { state } = useAdmin();
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("all");
  const [group, setGroup] = useState("all");

  const admins = state.users.filter((u) => u.role === "admin");
  const q = query.trim().toLowerCase();
  const rows = state.activity.filter(
    (a) =>
      (actor === "all" || a.actor_id === actor) &&
      (group === "all" || a.action.startsWith(`${group}.`)) &&
      (!q || a.target_label.toLowerCase().includes(q) || (a.detail ?? "").toLowerCase().includes(q)),
  );

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader title="บันทึกการทำงาน" subtitle="บันทึกจากฐานข้อมูลสูงสุด 500 รายการล่าสุด ใช้ตรวจย้อนหลังว่าใครทำอะไร เมื่อไหร่" />
      <FilterRow>
        <SearchField id="activity-search" label="ค้นหาในบันทึก" value={query} onChange={setQuery} placeholder="ค้นหาชื่อร้าน ผู้ใช้ เลขออเดอร์ หรือเหตุผล" />
        <SelectField
          id="activity-actor"
          label="ผู้ดูแล"
          value={actor}
          onChange={setActor}
          options={[{ value: "all", label: "ทุกคน" }, ...admins.map((u) => ({ value: u._id, label: u.name }))]}
        />
        <SelectField id="activity-group" label="เรื่อง" value={group} onChange={setGroup} options={GROUPS} />
      </FilterRow>
      <DataList
        label="บันทึกการทำงาน"
        rows={rows}
        pageSize={30}
        empty="ไม่มีบันทึกที่ตรงกับตัวกรอง"
        columns={[
          { key: "time", header: "เวลา", primary: true, render: (a) => formatDateTime(a.at) },
          { key: "actor", header: "ผู้ทำ", render: (a) => byId(state.users, a.actor_id)?.name ?? "–" },
          { key: "action", header: "การกระทำ", render: (a) => <span className="font-semibold">{ACTIVITY_LABEL[a.action] ?? a.action}</span> },
          {
            key: "target",
            header: "เป้าหมาย",
            render: (a) => {
              const to = targetLink(a, state);
              return to ? (
                <Link to={to} className={textLinkClass}>
                  {a.target_label}
                </Link>
              ) : (
                a.target_label
              );
            },
          },
          { key: "detail", header: "รายละเอียด", className: "max-w-xs", render: (a) => <span className="text-ink-soft">{a.detail ?? "–"}</span> },
        ]}
      />
    </div>
  );
}

export default Activity;
