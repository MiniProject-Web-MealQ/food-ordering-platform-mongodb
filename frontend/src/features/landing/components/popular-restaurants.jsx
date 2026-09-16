import { Link } from "react-router";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { focusRing, textLinkClass } from "@/components/ui/styles";
import { POPULAR_RESTAURANTS_PREVIEW } from "@/features/restaurants/preview-data";

export function PopularRestaurants() {
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
            <p className="mt-3 hidden text-lg text-muted lg:block">
              ร้านที่คนสั่งบ่อยที่สุดในสัปดาห์นี้
            </p>
          </div>
          <Link to="/customer/explore" className={`${textLinkClass} text-sm lg:text-base`}>
            ดูทั้งหมด
          </Link>
        </div>

        <ul className="mt-6 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-8 lg:mt-10 lg:grid-cols-4 lg:gap-6">
          {POPULAR_RESTAURANTS_PREVIEW.map((restaurant) => (
            <li key={restaurant.id} className="relative w-48 shrink-0 snap-start sm:w-auto">
              <Link
                to={`/customer/restaurants/${restaurant.id}`}
                className={`group block rounded-4xl sm:rounded-[2.25rem] sm:bg-linen sm:p-3 sm:ring-2 sm:ring-butter sm:transition-shadow sm:hover:shadow-card ${focusRing}`}
              >
                <ImagePlaceholder
                  label={restaurant.imageLabel}
                  className="aspect-4/3 rounded-4xl transition-transform group-hover:-translate-y-0.5"
                />
                <div className="sm:px-2 sm:pt-1 sm:pb-2">
                  <p className="mt-3 font-semibold text-ink lg:text-lg">{restaurant.name}</p>
                  <p className="text-sm text-muted">
                    {restaurant.category} · <span aria-hidden="true">★</span>
                    <span className="sr-only">คะแนน</span> {restaurant.rating.toFixed(1)} · คิว{" "}
                    {restaurant.queueLength}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
