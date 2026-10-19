import { cx } from "@/lib/cx";
import { selectionLabels } from "../option-groups";
import { useMerchant } from "../store";

/** ตัวเลือกเสริมที่ลูกค้าเลือกของรายการอาหาร 1 รายการ เช่น "เส้นเล็ก · เผ็ดน้อย · +เพิ่มหมู" */
export function ItemOptions({ item, className }) {
  const { state } = useMerchant();
  const menu = state.menus.find((m) => m._id === item.menu_id || m.client_id === item.menu_id);
  const labels = selectionLabels(item.selections, menu);
  if (labels.length === 0) return null;
  return (
    <span className={cx("block text-xs text-ink", className)}>
      <span className="sr-only">ตัวเลือก: </span>
      {labels.map((label, i) => (
        <span key={label.key}>
          {i > 0 && <span aria-hidden="true" className="text-ink-soft"> · </span>}
          <span className={label.extra ? "font-semibold text-cocoa" : undefined}>{label.text}</span>
        </span>
      ))}
    </span>
  );
}
