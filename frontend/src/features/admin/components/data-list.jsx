import { useState, useSyncExternalStore } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { cx } from "@/lib/cx";

const WIDE = "(min-width: 768px)";

function subscribe(onChange) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** จอกว้าง (md ขึ้นไป) หรือไม่ วาดแค่แบบเดียว ไม่ให้ id ของช่องกรอก/สวิตช์ในแถวซ้ำกันสองชุด */
function useWide() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => true);
}

/**
 * ตารางข้อมูลที่ใช้ทุกหน้ารายการ จอ md ขึ้นไปเป็น <table> มือถือเป็นการ์ดเรียงลง
 * columns: [{ key, header, render(row), className?, mobileClassName?, primary? }]
 *   primary = คอลัมน์หลัก (ใส่ลิงก์ไปหน้ารายละเอียด) เป็นหัวการ์ดบนมือถือ
 * แสดงทีละ pageSize แถว มีปุ่ม "แสดงเพิ่ม"
 */
export function DataList({ label, columns, rows, rowKey = (row) => row._id, empty = "ไม่มีข้อมูล", pageSize = 20, scrollable = false, tableClassName }) {
  const [visible, setVisible] = useState(pageSize);
  const wide = useWide();
  const shown = rows.slice(0, visible);
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);

  if (rows.length === 0) {
    return <p className="rounded-3xl bg-white px-5 py-10 text-center text-sm text-ink-soft ring-1 ring-haze">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {wide ? (
        <div
          className={cx("rounded-3xl bg-white ring-1 ring-haze", scrollable ? "overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" : "overflow-hidden")}
          role={scrollable ? "region" : undefined}
          aria-label={scrollable ? label : undefined}
          tabIndex={scrollable ? 0 : undefined}
        >
          <table className={cx("w-full text-left text-sm", tableClassName)}>
            <caption className="sr-only">{label}</caption>
            <thead className="bg-cream text-xs text-ink-soft">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={cx("px-4 py-3 font-semibold", c.className)}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-haze">
              {shown.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-cream/60">
                  {columns.map((c) => (
                    <td key={c.key} className={cx("px-4 py-3 align-middle text-ink", c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul aria-label={label} className="space-y-3">
          {shown.map((row) => (
            <li key={rowKey(row)} className="rounded-3xl bg-white p-4 ring-1 ring-haze">
              <div className="font-semibold text-ink">{primary.render(row)}</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {rest.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-xs text-ink-soft">{c.header}</dt>
                    <dd className={cx("text-ink", c.mobileClassName ?? "truncate")}>{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
        <p aria-live="polite">
          แสดง {shown.length} จาก {rows.length} รายการ
        </p>
        {visible < rows.length && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            className={buttonClasses({ variant: "cocoa-outline", size: "sm" })}
          >
            แสดงเพิ่ม
          </button>
        )}
      </div>
    </div>
  );
}
