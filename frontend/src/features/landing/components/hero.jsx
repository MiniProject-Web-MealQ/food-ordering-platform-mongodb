import { Link } from "react-router";
import { Play } from "lucide-react";
import { buttonClasses } from "@/components/ui/styles";
import { CatalogImage } from "@/features/customer/components/catalog-image";

const HIGHLIGHTS = [
  "ทดลองจ่ายด้วย PromptPay หรือ Wallet Demo",
  "แจ้งเตือนเมื่ออาหารพร้อม",
  "รับด้วยรหัส 4 หลัก",
];

export function Hero({ catalogueState }) {
  const { catalogue, status } = catalogueState;
  const { restaurant, menu } = catalogue.featured || {};
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
            <Link to="/customer/explore" className={`${buttonClasses()} flex-1 sm:flex-none sm:px-10`}>
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

        <div className="relative">
          {restaurant ? (
            <>
              <Link to={restaurant.href} className="group relative block overflow-hidden rounded-4xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
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
    </section>
  );
}
