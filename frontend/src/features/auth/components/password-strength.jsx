import { cx } from "@/lib/cx";
import { checkPassword, MIN_PASSWORD_LENGTH } from "../password";

const COPY = {
  length: { passed: "ความยาวพอดี", missing: `ใช้อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร` },
  letter: { passed: "มีตัวอักษร", missing: "เพิ่มตัวอักษร" },
  digit: { passed: "มีตัวเลข", missing: "เพิ่มตัวเลข" },
  symbol: { passed: "มีอักขระพิเศษ", missing: "เพิ่มอักขระพิเศษให้แข็งแรงขึ้น" },
};

const BAR_COLOR = ["bg-mint", "bg-alert", "bg-leaf", "bg-leaf", "bg-brand"];

export function PasswordStrength({ id, password }) {
  const checks = checkPassword(password);
  const score = checks.filter((c) => c.passed).length;
  const passed = checks.filter((c) => c.passed).map((c) => `✓ ${COPY[c.id].passed}`);
  const nextStep = checks.find((c) => !c.passed);

  return (
    <div id={id} className="space-y-2">
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        {checks.map((check, index) => (
          <span
            key={check.id}
            className={cx("h-1.5 rounded-full", index < score ? BAR_COLOR[score] : "bg-mint")}
          />
        ))}
      </div>
      <p className="px-1 text-sm text-ink">
        <span className="sr-only">ความแข็งแรงรหัสผ่าน {score} จาก 4: </span>
        {password
          ? passed.join(" ")
          : `ใช้อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร มีตัวอักษรและตัวเลข`}
        {password && nextStep && `${passed.length ? " — " : ""}${COPY[nextStep.id].missing}`}
      </p>
    </div>
  );
}
