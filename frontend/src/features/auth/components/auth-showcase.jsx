import { Logo } from "@/components/brand/logo";

const BENEFITS = [
  "ดูคิวและเวลารอก่อนสั่ง",
  "จ่ายจบในแอป ด้วย PromptPay หรือบัตร",
  "แจ้งเตือนทันทีเมื่ออาหารพร้อม",
];

const TRACK = ["สั่งแล้ว", "เข้าคิว", "กำลังทำ", "พร้อมรับ"];

/** Brand panel shown beside auth forms on large screens. Decorative only — no live data. */
export function AuthShowcase() {
  return (
    <aside className="relative hidden overflow-hidden bg-mint lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 -bottom-28 size-96 rounded-full bg-leaf/60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 bottom-40 size-24 rounded-full bg-brand/30"
      />
      <div className="relative">
        <Logo />
      </div>

      <div className="relative max-w-lg space-y-8">
        <div className="space-y-4">
          <p className="text-5xl leading-[1.2] font-bold text-ink xl:text-6xl">
            สั่งก่อน
            <br />
            ไม่ต้องต่อคิว
          </p>
          <ul className="space-y-2 text-lg text-ink/80">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-brand" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden="true" className="max-w-sm rounded-4xl bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-soft">คิวของคุณ · ร้านป้าแดง</p>
              <p className="text-5xl font-bold text-ink">#18</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-ink">
              อีก ~6 นาที
            </span>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {TRACK.map((step, index) => (
              <div key={step} className="space-y-1.5">
                <span
                  className={`block h-2 rounded-full ${index < 3 ? "bg-brand" : "bg-mint"}`}
                />
                <span className="block text-xs text-ink-soft">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="relative text-sm text-ink-soft">© 2026 MealQ · Order fast. Skip the queue.</p>
    </aside>
  );
}
