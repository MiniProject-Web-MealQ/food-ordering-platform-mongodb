import { cx } from "@/lib/cx";

// Flat butter tints that deepen step by step.
const STEPS = [
  { title: "เลือกร้าน", description: "ดูคิวและเวลารอก่อนสั่ง", tone: "bg-butter/60" },
  { title: "สั่งและจ่าย", description: "PromptPay หรือบัตร จ่ายจบในแอป", tone: "bg-butter" },
  { title: "รอแจ้งเตือน", description: "เห็นคิวปัจจุบันแบบเรียลไทม์", tone: "bg-butter/60" },
  { title: "เดินมารับ", description: "แสดงรหัส 4 หลักหรือ QR ที่ร้าน", tone: "bg-butter" },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-5 py-10 sm:px-8 lg:py-20"
    >
      <div className="lg:flex lg:items-end lg:justify-between">
        <div>
          <h2 id="how-it-works-title" className="text-3xl font-bold text-ink lg:text-5xl">
            ใช้งานอย่างไร
          </h2>
          <p className="mt-1 text-muted lg:mt-3 lg:text-lg">4 ขั้นตอน เสร็จใน 1 นาที</p>
        </div>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4 lg:gap-5">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className={cx(
              "flex items-center gap-5 rounded-4xl px-6 py-5",
              "lg:flex-col lg:items-start lg:gap-10 lg:px-7 lg:py-8",
              step.tone,
            )}
          >
            <span
              aria-hidden="true"
              className="text-3xl font-bold text-apricot tabular-nums lg:text-5xl"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="block font-semibold text-ink lg:text-xl">{step.title}</span>
              <span className="block text-sm text-muted lg:mt-1 lg:text-base">
                {step.description}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
