import { cx } from "@/lib/cx";
import { PROMOTION_STATE_LABEL, ROLE_LABEL, STORE_STATUS_LABEL, USER_STATUS_LABEL } from "../labels";

const base = "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

function Dot({ tone }) {
  return <span aria-hidden="true" className={cx("size-2 rounded-full", tone)} />;
}

export function StoreStatusBadge({ store }) {
  if (store.status !== "active") {
    const tone = { suspended: "bg-alert/15 text-danger", pending: "bg-amber/20 text-ink", rejected: "bg-haze text-ink-soft" }[store.status];
    return <span className={cx(base, tone)}>{STORE_STATUS_LABEL[store.status]}</span>;
  }
  return store.is_open ? (
    <span className={cx(base, "bg-mint text-brand-ink")}>
      <Dot tone="bg-brand" />
      เปิดอยู่
    </span>
  ) : (
    <span className={cx(base, "bg-haze text-ink-soft")}>
      <Dot tone="bg-ink-soft/50" />
      ปิดอยู่
    </span>
  );
}

export function UserStatusBadge({ status }) {
  return (
    <span className={cx(base, status === "active" ? "bg-mint text-brand-ink" : "bg-alert/15 text-danger")}>
      {USER_STATUS_LABEL[status]}
    </span>
  );
}

export function RoleBadge({ role }) {
  const tone = {
    admin: "bg-forest text-white",
    merchant: "bg-cocoa/15 text-cocoa",
    staff: "bg-cream text-ink ring-1 ring-haze",
    customer: "bg-haze text-ink",
  }[role];
  return <span className={cx(base, tone)}>{ROLE_LABEL[role]}</span>;
}

export function PromotionStateBadge({ state }) {
  const tone = {
    live: "bg-mint text-brand-ink",
    scheduled: "bg-cream text-ink ring-1 ring-haze",
    expired: "bg-haze text-ink-soft",
    used_up: "bg-amber/20 text-ink",
    disabled: "bg-haze text-ink-soft",
  }[state];
  return <span className={cx(base, tone)}>{PROMOTION_STATE_LABEL[state]}</span>;
}

/** ป้ายบอกว่าหน้านี้ยังใช้ข้อมูลจำลอง (MOCK) ผู้ใช้จะได้รู้ว่าการแก้ไขยังไม่มีผลกับระบบจริง */
export function MockBadge({ className }) {
  return (
    <span
      className={cx(base, "bg-amber text-ink", className)}
      title="ยังไม่ได้เชื่อม API ของ admin การแก้ไขเก็บอยู่ในเบราว์เซอร์นี้เท่านั้น"
    >
      ข้อมูลจำลอง
    </span>
  );
}
