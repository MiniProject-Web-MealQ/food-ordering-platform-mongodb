import { Link } from "react-router";
import { buttonClasses } from "@/components/ui/styles";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";

const HIGHLIGHTS = [
  "จ่ายผ่าน PromptPay หรือบัตร",
  "แจ้งเตือนเมื่ออาหารพร้อม",
  "รับด้วยรหัส 4 หลัก",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pt-4 pb-12 sm:px-8 md:grid-cols-2 md:pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24">
        <div className="space-y-6 lg:space-y-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-sm font-semibold text-ink">
            <span aria-hidden="true">🍜</span>
            ร้านอาหารในมหาวิทยาลัยและออฟฟิศ
          </p>
          <h1 className="text-5xl leading-[1.2] font-bold text-ink lg:text-7xl lg:leading-[1.15]">
            สั่งก่อน
            <br />
            ไม่ต้องต่อคิว
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-ink-soft lg:max-w-lg lg:text-xl">
            เลือกร้าน สั่งอาหาร จ่ายเงิน และรอรับอาหารได้ง่าย ๆ ผ่าน MealQ
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className={`${buttonClasses()} flex-1 sm:flex-none sm:px-10`}>
              เริ่มสั่งอาหาร
            </Link>
            <Link to="/register?role=merchant" className={buttonClasses({ variant: "outline" })}>
              ฉันเป็นร้านค้า
            </Link>
          </div>
          <ul className="hidden flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft lg:flex">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="grid size-5 place-items-center rounded-full bg-leaf text-xs text-ink"
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Queue toasts are part of the hero artwork, not live data. */}
        <div className="relative">
          <ImagePlaceholder
            label="รูป hero: คนรับอาหารที่เคาน์เตอร์"
            className="aspect-4/3 rounded-4xl lg:aspect-5/4"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-full bg-white py-2.5 pr-6 pl-3 shadow-float sm:left-6 lg:-left-8"
          >
            <span className="grid size-10 place-items-center rounded-full bg-leaf font-bold text-ink">
              18
            </span>
            <span className="leading-tight">
              <span className="block font-semibold text-ink">อาหารพร้อมแล้ว</span>
              <span className="block text-sm text-ink-soft">คิว #18 · ร้านป้าแดง</span>
            </span>
          </div>
          <div
            aria-hidden="true"
            className="absolute -top-5 -right-4 hidden items-center gap-3 rounded-3xl bg-white px-5 py-3 shadow-float lg:flex"
          >
            <span className="size-3 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
            <span className="leading-tight">
              <span className="block text-xs text-ink-soft">คิวปัจจุบัน</span>
              <span className="block text-2xl font-bold text-ink">#15</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
