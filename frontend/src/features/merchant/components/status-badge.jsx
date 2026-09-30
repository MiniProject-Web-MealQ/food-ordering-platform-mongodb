import { cx } from "@/lib/cx";
import { ORDER_STATUS_LABEL } from "../status";

const ORDER_TONE = {
  pending: "bg-alert/15 text-danger",
  confirmed: "bg-mint text-brand-ink",
  preparing: "bg-brand/25 text-brand-ink",
  ready: "bg-cocoa text-white",
  completed: "bg-haze text-ink-soft",
  cancelled: "bg-haze text-danger line-through decoration-danger/40",
};

export function OrderStatusBadge({ status, className }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        ORDER_TONE[status],
        className,
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

/** `compact` shows only "เปิด"/"ปิด" for the slim desktop rail; screen readers still get the full text. */
export function StoreStatusPill({ isOpen, compact = false, className }) {
  const label = isOpen ? "เปิดรับออเดอร์" : "ปิดร้านอยู่";
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        isOpen ? "bg-mint text-brand-ink" : "bg-haze text-ink-soft",
        className,
      )}
    >
      <span aria-hidden="true" className={cx("size-2 rounded-full", isOpen ? "bg-brand" : "bg-ink-soft/50")} />
      {compact ? (
        <>
          <span aria-hidden="true">{isOpen ? "เปิด" : "ปิด"}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  );
}

/** Small count bubble for nav items. Hidden from screen readers; callers put the count in the label. */
export function CountBubble({ count, className }) {
  if (!count) return null;
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid h-5 min-w-5 place-items-center rounded-full bg-alert px-1.5 text-xs leading-none font-bold text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
