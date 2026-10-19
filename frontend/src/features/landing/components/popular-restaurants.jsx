import { Link } from "react-router";
import { CatalogImage } from "@/features/customer/components/catalog-image";
import { focusRing, textLinkClass } from "@/components/ui/styles";

export function PopularRestaurants({ catalogueState }) {
  const { catalogue, status, refreshing, retry } = catalogueState;
  const restaurants = catalogue.restaurants.slice(0, 6);
  return (
    <section id="popular" aria-labelledby="popular-restaurants-title" className="scroll-mt-24 bg-white py-10 lg:py-20">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-baseline justify-between gap-4 px-5 sm:px-8">
          <div>
            <h2 id="popular-restaurants-title" className="text-3xl font-bold text-ink lg:text-5xl">เลือกร้านที่ใช่</h2>
            <p className="mt-3 text-ink-soft lg:text-lg">
              เลือกร้านอาหารและดูเมนูจากร้านจริง
              {status !== "loading" && status !== "error" && ` · ${catalogue.restaurantCount} ร้าน ${catalogue.menuCount} เมนู`}
            </p>
          </div>
          <Link to="/customer/explore" className={`${textLinkClass} shrink-0 text-sm lg:text-base`}>ดูทั้งหมด</Link>
        </div>
        {restaurants.length > 0 && (
          <ul className="mt-6 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-8 lg:mt-10 lg:grid-cols-3 lg:gap-6">
            {restaurants.map((restaurant) => (
              <li key={restaurant.backendId} className="relative w-64 shrink-0 snap-start sm:w-auto">
                <Link to={restaurant.href} className={`group block h-full rounded-4xl bg-snow p-3 ring-1 ring-mint transition-shadow hover:shadow-card sm:rounded-[2.25rem] ${focusRing}`}>
                  <div className="relative">
                    <CatalogImage src={restaurant.coverImage || restaurant.menus.find((menu) => menu.image)?.image || restaurant.logo} label={`แบนเนอร์ร้าน ${restaurant.name}`} className="aspect-16/10 rounded-3xl transition-transform group-hover:-translate-y-0.5" />
                    <span className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${restaurant.isOpen ? "bg-mint text-brand-ink" : "bg-white text-ink-soft"}`}>
                      {restaurant.isOpen ? "เปิดรับออเดอร์" : "ปิดรับออเดอร์"}
                    </span>
                    <CatalogImage src={restaurant.logo || restaurant.coverImage} label={`โปรไฟล์ร้าน ${restaurant.name}`} compact className="absolute -bottom-5 left-3 size-14 rounded-2xl bg-white ring-4 ring-snow" />
                  </div>
                  <div className="px-2 pt-6 pb-2">
                    <h3 className="mt-2 font-semibold text-ink lg:text-xl">{restaurant.name}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{restaurant.category} · {restaurant.menuCount} เมนู</p>
                    <p className="mt-2 text-xs text-ink-soft sm:text-sm">{restaurant.ratingLabel}</p>
                    {restaurant.isOpen && restaurant.queueCount !== null && <p className="mt-1 text-sm font-semibold text-brand-ink">{restaurant.queueCount} ออเดอร์ในคิว</p>}
                    <p className="mt-3 text-sm font-semibold text-cocoa">ดูเมนู <span aria-hidden="true">→</span></p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {status === "loading" && <p role="status" className="px-5 pt-6 text-ink-soft sm:px-8">กำลังโหลดร้านอาหารและรูปเมนู…</p>}
        {(status === "error" || status === "stale") && (
          <div role="status" className="mx-5 mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-haze p-4 text-sm text-ink-soft sm:mx-8">
            <p>{status === "stale" ? "อัปเดตข้อมูลล่าสุดไม่ได้ กำลังแสดงข้อมูลที่โหลดไว้ ร้านอาจมีการเปลี่ยนแปลง" : "ยังโหลดร้านอาหารไม่ได้ กรุณาลองใหม่อีกครั้ง"}</p>
            <button type="button" onClick={retry} disabled={refreshing} className={`${textLinkClass} rounded px-2 py-1 disabled:opacity-50 ${focusRing}`}>{refreshing ? "กำลังลองใหม่…" : "ลองใหม่"}</button>
          </div>
        )}
        {status === "ready" && !restaurants.length && <p className="px-5 pt-6 text-ink-soft sm:px-8">ยังไม่มีร้านอาหารที่เปิดใช้งาน</p>}
      </div>
    </section>
  );
}
