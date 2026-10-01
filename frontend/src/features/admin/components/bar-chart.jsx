import { useId, useState } from "react";
import { cx } from "@/lib/cx";

/** ปัดค่าสูงสุดขึ้นเป็นเลขกลม ๆ (เช่น 120, 250, 6,000) และเผื่อที่ด้านบนให้ตัวเลขบนแท่งไม่ชนหัวกราฟ */
function niceCeiling(value) {
  const target = value * 1.15;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * magnitude >= target);
  return step * magnitude;
}

/**
 * กราฟแท่งแนวตั้งชุดเดียว (ไม่มี legend ชื่อกราฟบอกแล้วว่าเป็นอะไร)
 * - แท่งสี cocoa ปลายมน 4px เว้นช่องระหว่างแท่ง เส้นตารางจาง ๆ 3 เส้น
 * - ชี้เมาส์หรือกด Tab ไปที่แท่งเพื่อดูค่า แสดงตัวเลขบนแท่งเฉพาะค่าสูงสุดและแท่งล่าสุด
 * - มีปุ่มสลับเป็นตาราง สำหรับคนที่อ่านกราฟไม่สะดวก
 * data: [{ key, label, longLabel?, value }]
 */
export function BarChart({ title, data, formatValue = (v) => String(v), valueHeader = "ค่า", height = "h-44" }) {
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const max = niceCeiling(Math.max(1, ...data.map((d) => d.value)));
  const peakKey = data.reduce((best, d) => (d.value > (best?.value ?? -1) ? d : best), null)?.key;
  const lastKey = data.at(-1)?.key;
  const dense = data.length > 10;

  return (
    <figure aria-labelledby={titleId} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <figcaption id={titleId} className="text-lg font-bold text-ink">
          {title}
        </figcaption>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="rounded text-sm font-semibold text-brand-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {asTable ? "ดูเป็นกราฟ" : "ดูเป็นตาราง"}
        </button>
      </div>

      {asTable ? (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-ink-soft">
            <tr>
              <th scope="col" className="py-1.5 font-semibold">
                ช่วงเวลา
              </th>
              <th scope="col" className="py-1.5 text-right font-semibold">
                {valueHeader}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-haze">
            {data.map((d) => (
              <tr key={d.key}>
                <td className="py-1.5 text-ink">{d.longLabel ?? d.label}</td>
                <td className="py-1.5 text-right font-semibold text-ink tabular-nums">{formatValue(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          {/* เส้นตาราง: 0, ครึ่ง, สูงสุด */}
          <div aria-hidden="true" className={cx("pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between", height)}>
            {[max, max / 2, 0].map((v) => (
              <div key={v} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-right text-[11px] text-ink-soft tabular-nums">{formatValue(Math.round(v))}</span>
                <span className="h-px flex-1 bg-haze" />
              </div>
            ))}
          </div>
          <ul className={cx("relative ml-16 flex items-end gap-0.5 sm:gap-1", height)}>
            {data.map((d, index) => {
              const pct = (d.value / max) * 100;
              // แท่งริมซ้าย/ขวา: ชิดกล่องค่าเข้าด้านใน ไม่ให้ล้นขอบจอ
              const align = index < 2 ? "left-0" : index >= data.length - 2 ? "right-0" : "left-1/2 -translate-x-1/2";
              const labelled = d.value > 0 && (d.key === peakKey || d.key === lastKey);
              return (
                <li
                  key={d.key}
                  tabIndex={0}
                  aria-label={`${d.longLabel ?? d.label}: ${formatValue(d.value)}`}
                  className="group relative flex h-full flex-1 items-end rounded-t outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <span
                    aria-hidden="true"
                    className="block w-full rounded-t-[4px] bg-cocoa transition-opacity group-hover:opacity-80"
                    style={{ height: `${Math.max(pct, d.value > 0 ? 2 : 0)}%` }}
                  />
                  {labelled && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -translate-y-full pb-1 text-center text-[11px] font-semibold text-ink tabular-nums group-hover:invisible group-focus-visible:invisible"
                      style={{ bottom: `${pct}%` }}
                    >
                      {formatValue(d.value)}
                    </span>
                  )}
                  {/* tooltip ตอนชี้หรือ focus */}
                  <span
                    aria-hidden="true"
                    className={cx(
                      "pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-xl bg-forest px-2.5 py-1.5 text-center text-xs whitespace-nowrap text-white shadow-float group-hover:block group-focus-visible:block",
                      align,
                    )}
                  >
                    <span className="block text-white/75">{d.longLabel ?? d.label}</span>
                    <span className="block font-semibold tabular-nums">{formatValue(d.value)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <ul aria-hidden="true" className="mt-1.5 ml-16 flex gap-0.5 sm:gap-1">
            {data.map((d, i) => (
              <li key={d.key} className="flex-1 truncate text-center text-[11px] text-ink-soft">
                {dense && i % 2 === 1 ? "" : d.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
