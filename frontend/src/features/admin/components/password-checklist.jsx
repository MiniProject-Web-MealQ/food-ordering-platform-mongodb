import { Check, Circle } from "lucide-react";
import { cx } from "@/lib/cx";
import { checkAdminPassword } from "../password";

/** รายการเกณฑ์รหัสผ่านที่ติ๊กถูกตามที่พิมพ์ ใช้คู่กับช่องรหัสผ่านผ่าน aria-describedby={id} */
export function PasswordChecklist({ id, password }) {
  const checks = checkAdminPassword(password);
  const passed = checks.filter((c) => c.passed).length;

  return (
    <div id={id} className="space-y-2">
      <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
        {checks.map((c, i) => (
          <span key={c.id} className={cx("h-1.5 rounded-full", i < passed ? (passed === 4 ? "bg-brand" : "bg-leaf") : "bg-haze")} />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        ผ่านเกณฑ์รหัสผ่าน {passed} จาก {checks.length} ข้อ
      </p>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.id} className={cx("flex items-center gap-1.5", c.passed ? "text-brand-ink" : "text-ink-soft")}>
            {c.passed ? <Check aria-hidden="true" className="size-4" /> : <Circle aria-hidden="true" className="size-3.5" />}
            <span>
              {c.label}
              <span className="sr-only">{c.passed ? " (ผ่าน)" : " (ยังไม่ผ่าน)"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
