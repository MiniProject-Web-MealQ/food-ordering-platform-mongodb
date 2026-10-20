import { Link } from "react-router";
import { Play } from "lucide-react";
import { buttonClasses } from "@/components/ui/styles";
import { CatalogImage } from "@/features/customer/components/catalog-image";

const HIGHLIGHTS = [
  "ทดลองจ่ายด้วย PromptPay หรือ Wallet Demo",
  "แจ้งเตือนเมื่ออาหารพร้อม",
  "รับด้วยรหัส 4 หลัก",
];

const STEPS = [
  { emoji: "🧾", label: "เลือกเมนู" },
  { emoji: "💳", label: "จ่ายในแอป" },
  { emoji: "🔔", label: "รอแจ้งเตือน" },
  { emoji: "🥡", label: "รับด้วยรหัส" },
];

/** Soft warm washes behind the hero so the white space reads as part of the design. */
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-96 bg-linear-to-b from-mint/45 via-page/40 to-white" />
      <div className="absolute -top-32 -left-28 size-96 rounded-full bg-leaf/20 blur-3xl" />
      <div className="absolute top-56 -right-24 size-112 rounded-full bg-brand/12 blur-3xl" />
      <div
        className="absolute inset-x-0 top-0 h-96 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--color-cocoa) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="min-w-0">
      <p className="font-display text-2xl leading-none font-black text-cocoa lg:text-3xl">{value}</p>
      <p className="mt-1 truncate text-xs text-ink-soft lg:text-sm">{label}</p>
    </div>
  );
}

/** Live counts from the public catalogue; they fall back to “–” until the API answers. */
function HeroStats({ catalogue, status }) {
  const ready = status === "ready";
  const open = catalogue.restaurants.filter((store) => store.isOpen);
  const queueing = open.reduce((total, store) => total + (store.queueCount ?? 0), 0);

  return (
    <dl className="grid max-w-md grid-cols-3 gap-4 rounded-4xl bg-white/70 p-4 ring-1 ring-line backdrop-blur sm:gap-6 sm:p-5 lg:max-w-lg">
      <Stat value={ready ? open.length : "–"} label="ร้านเปิดรับออเดอร์" />
      <Stat value={ready ? catalogue.menuCount : "–"} label="เมนูให้เลือก" />
      <Stat value={ready ? queueing : "–"} label="ออเดอร์ในคิวตอนนี้" />
    </dl>
  );
}

/** Logos of the stores taking orders, so the page shows real activity instead of empty space. */
function OpenStoreStrip({ catalogue, status }) {
  const stores = catalogue.restaurants.filter((store) => store.isOpen).slice(0, 6);
  if (status !== "ready" || stores.length === 0) return null;

  return (
    <section
      aria-label="ร้านที่เปิดรับออเดอร์ตอนนี้"
      className="relative mx-auto w-full max-w-7xl px-5 pb-10 sm:px-8 lg:pb-16"
    >
      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:gap-6">
        <p className="flex shrink-0 items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true" className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
          </span>
          เปิดรับออเดอร์ตอนนี้
        </p>
        <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {stores.map((store) => (
            <li key={store.id}>
              <Link
                to={store.href}
                className="flex shrink-0 items-center gap-2 rounded-full bg-cream py-1.5 pr-4 pl-1.5 text-sm font-semibold whitespace-nowrap text-ink ring-1 ring-line transition-colors hover:bg-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <CatalogImage
                  src={store.logo || store.coverImage}
                  label={`โลโก้ ${store.name}`}
                  compact
                  className="size-7 shrink-0 rounded-full"
                />
                {store.name}
                <span className="font-normal text-ink-soft">
                  {store.queueCount ? `คิว ${store.queueCount}` : "ว่าง"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Hero({ catalogueState }) {
  const { catalogue, status } = catalogueState;
  const { restaurant, menu } = catalogue.featured || {};
  return (
    <section className="relative overflow-hidden">
      <Backdrop />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 pt-4 pb-12 sm:px-8 md:grid-cols-2 md:pt-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16 lg:pb-16">
        <div className="space-y-6 lg:space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-sm font-semibold text-ink ring-1 ring-leaf/60">
            <span aria-hidden="true">🍜</span>
            ร้านอาหารในมหาวิทยาลัยและออฟฟิศ
          </p>
          <h1 className="text-5xl leading-[1.2] font-bold text-ink lg:text-7xl lg:leading-[1.15]">
            สั่งก่อน
            <br />
            ไม่ต้อง
            <span className="relative inline-block">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-1.5 h-4 -skew-x-6 rounded-sm bg-leaf/70 lg:bottom-3 lg:h-6"
              />
              <span className="relative">ต่อคิว</span>
            </span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-ink-soft lg:max-w-lg lg:text-xl">
            เลือกร้าน สั่งอาหาร จ่ายเงิน และรอรับอาหารได้ง่าย ๆ ผ่าน MealQ
          </p>

          <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-ink-soft">
            {STEPS.map((step, index) => (
              <li key={step.label} className="flex items-center gap-1">
                <span className="flex items-center gap-2 rounded-full bg-white/80 py-1.5 pr-4 pl-2 ring-1 ring-line">
                  <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-mint text-xs">
                    {step.emoji}
                  </span>
                  <span className="font-medium text-ink">{step.label}</span>
                </span>
                {index < STEPS.length - 1 && (
                  <span aria-hidden="true" className="hidden px-0.5 text-ink-soft/60 sm:inline">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            <Link to="/customer/explore" className={`${buttonClasses()} flex-1 shadow-float sm:flex-none sm:px-10`}>
              เลือกร้านอาหาร
            </Link>
            <Link to="/register?role=merchant" className={buttonClasses({ variant: "outline" })}>
              ฉันเป็นร้านค้า
            </Link>
          </div>
          <Link to="/demo" className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-cocoa underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
            <span className="grid size-8 place-items-center rounded-full bg-haze"><Play aria-hidden="true" className="size-3.5" /></span>
            ดูสาธิตการสั่งซื้อและจัดการร้าน
          </Link>

          <HeroStats catalogue={catalogue} status={status} />

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
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

        <div className="relative">
          {restaurant ? (
            <>
              <Link to={restaurant.href} className="group relative block overflow-hidden rounded-4xl shadow-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
                <CatalogImage
                  src={menu?.image || restaurant.coverImage}
                  label={menu ? `${menu.name} จาก ${restaurant.name}` : `อาหารและบรรยากาศร้าน ${restaurant.name}`}
                  loading="eager"
                  fetchPriority="high"
                  className="aspect-4/3 rounded-4xl transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none lg:aspect-5/4"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-6 pt-16 pb-16 text-white">
                  <p className="text-xl font-bold sm:text-2xl">{menu?.name || restaurant.name}</p>
                  <p className="mt-1 text-sm text-white/90">
                    {menu?.price !== null && menu?.price !== undefined && <>฿{menu.price.toLocaleString("th-TH")} · </>}
                    ดูเมนูร้านนี้ <span aria-hidden="true">→</span>
                  </p>
                </div>
              </Link>
              <Link
                to={restaurant.href}
                className="absolute -bottom-6 right-4 left-4 flex items-center gap-3 rounded-3xl bg-white p-3 shadow-float focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:left-6 sm:right-auto sm:max-w-[90%] sm:pr-6 lg:-left-8"
              >
                <CatalogImage src={restaurant.logo || restaurant.coverImage} label={`โปรไฟล์ร้าน ${restaurant.name}`} compact className="size-12 shrink-0 rounded-2xl" />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate font-semibold text-ink">{restaurant.name}</span>
                  <span className="mt-1 block text-xs text-ink-soft sm:text-sm">
                    {restaurant.isOpen ? "เปิดรับออเดอร์" : "ปิดรับออเดอร์"}
                    {restaurant.isOpen && restaurant.queueCount !== null && ` · ${restaurant.queueCount} ออเดอร์ในคิว`}
                    {` · ${restaurant.menuCount} เมนู`}
                  </span>
                </span>
              </Link>
              <div className="absolute -top-4 right-3 flex items-center gap-3 rounded-3xl bg-white px-4 py-3 shadow-float lg:-right-4">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-leaf text-lg">🍽️</span>
                <span className="leading-tight">
                  <span className="block text-xs text-ink-soft">เลือกร้านและเมนูได้หลากหลาย</span>
                  <span className="mt-1 block font-bold text-ink">{catalogue.restaurantCount} ร้าน · {catalogue.menuCount} เมนู</span>
                </span>
              </div>
              <div className="absolute top-1/3 -left-2 hidden items-center gap-2 rounded-2xl bg-forest px-3 py-2 text-white shadow-float lg:flex">
                <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-brand text-sm text-ink">
                  ⏱
                </span>
                <span className="text-xs leading-tight">
                  <span className="block text-white/70">เวลารอโดยประมาณ</span>
                  <span className="block font-bold">10–15 นาที</span>
                </span>
              </div>
            </>
          ) : (
            <div className="flex aspect-4/3 items-center justify-center rounded-4xl bg-haze p-8 text-center text-ink-soft lg:aspect-5/4" role="status">
              <div>
                <span aria-hidden="true" className="mb-4 block text-5xl">🍽️</span>
                {status === "loading" ? "กำลังเตรียมร้านอาหารและเมนูล่าสุด…" : status === "error" ? "ยังโหลดร้านอาหารไม่ได้ ลองใหม่ได้ที่รายการร้านด้านล่าง" : "พบกับร้านอาหารและเมนูใหม่ ๆ ได้ที่นี่เร็ว ๆ นี้"}
              </div>
            </div>
          )}
        </div>
      </div>

      <OpenStoreStrip catalogue={catalogue} status={status} />
    </section>
  );
}
