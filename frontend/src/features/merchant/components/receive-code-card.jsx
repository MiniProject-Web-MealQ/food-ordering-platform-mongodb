import { cx } from "@/lib/cx";

const HINT = {
  pending: "ลูกค้าได้รหัสนี้ในแอปแล้ว ใช้ยืนยันตอนมารับอาหาร",
  confirmed: "ลูกค้าได้รหัสนี้ในแอปแล้ว ใช้ยืนยันตอนมารับอาหาร",
  preparing: "ลูกค้าได้รหัสนี้ในแอปแล้ว ใช้ยืนยันตอนมารับอาหาร",
  ready: "ให้ลูกค้าแสดงรหัสในแอป ตรงกันแล้วค่อยส่งอาหาร",
  completed: "ใช้รหัสนี้รับอาหารไปแล้ว",
  cancelled: "ออเดอร์ถูกยกเลิก รหัสนี้ใช้ไม่ได้แล้ว",
};

/** The 4-digit receive_code the customer was given, shown large so staff can compare it at the counter. */
export function ReceiveCodeCard({ code, status }) {
  const spent = status === "completed" || status === "cancelled";

  return (
    <section aria-labelledby="receive-code-card-title" className="rounded-3xl bg-forest px-5 py-6 text-center text-white">
      <h2 id="receive-code-card-title" className="text-sm font-semibold text-brand">
        รหัสรับอาหารของลูกค้า
      </h2>
      <p
        className={cx(
          "mt-2 font-display text-6xl leading-none font-black tracking-[0.15em]",
          spent && "text-white/40 line-through decoration-2",
        )}
      >
        {code}
      </p>
      <p className="mt-3 text-sm text-white/75">{HINT[status]}</p>
    </section>
  );
}
