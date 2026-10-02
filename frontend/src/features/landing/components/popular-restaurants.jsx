import { Link } from "react-router";
import { useEffect, useState } from "react";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { focusRing, textLinkClass } from "@/components/ui/styles";
import { getJson } from "@/lib/api-client";

export function PopularRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let active = true;
    getJson("/restaurants").then((result) => {
      if (!active) return;
      setStatus(result.ok ? "ready" : "error");
      if (result.ok) setRestaurants([...result.data.restaurants].sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0)).slice(0, 4));
    });
    return () => { active = false; };
  }, []);
  return (
    <section
      id="popular"
      aria-labelledby="popular-restaurants-title"
      className="scroll-mt-24 bg-white py-10 lg:py-20"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-baseline justify-between gap-4 px-5 sm:px-8">
          <div>
            <h2 id="popular-restaurants-title" className="text-3xl font-bold text-ink lg:text-5xl">
              ร้านยอดนิยม
            </h2>
            <p className="mt-3 hidden text-lg text-ink-soft lg:block">
              เลือกร้านอาหารและดูคิวก่อนสั่ง
            </p>
          </div>
          <Link to="/customer/explore" className={`${textLinkClass} text-sm lg:text-base`}>
            ดูทั้งหมด
          </Link>
        </div>

        <ul className="mt-6 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-8 lg:mt-10 lg:grid-cols-4 lg:gap-6">
          {restaurants.map((restaurant) => (
            <li key={restaurant.id} className="relative w-48 shrink-0 snap-start sm:w-auto">
              <Link
                to={`/customer/restaurants/${restaurant.clientId || restaurant.id}`}
                className={`group block rounded-4xl sm:rounded-[2.25rem] sm:bg-snow sm:p-3 sm:ring-2 sm:ring-mint sm:transition-shadow sm:hover:shadow-card ${focusRing}`}
              >
                <ImagePlaceholder
                  label={restaurant.name}
                  className="aspect-4/3 rounded-4xl transition-transform group-hover:-translate-y-0.5"
                />
                <div className="sm:px-2 sm:pt-1 sm:pb-2">
                  <p className="mt-3 font-semibold text-ink lg:text-lg">{restaurant.name}</p>
                  <p className="text-sm text-ink-soft">
                    <span aria-hidden="true">★</span>
                    <span className="sr-only">คะแนน</span> {Number(restaurant.rating?.average || 0).toFixed(1)} · {restaurant.isOpen ? "เปิดรับออเดอร์" : "ปิดรับออเดอร์"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {status === "loading" && <p role="status" className="px-5 pt-4 text-ink-soft">กำลังโหลดร้านอาหาร…</p>}
        {status === "error" && <p role="alert" className="px-5 pt-4 text-ink-soft">ยังโหลดร้านอาหารไม่ได้ กรุณาลองใหม่ภายหลัง</p>}
        {status === "ready" && !restaurants.length && <p className="px-5 pt-4 text-ink-soft">ยังไม่มีร้านอาหารที่เปิดใช้งาน</p>}
      </div>
    </section>
  );
}
