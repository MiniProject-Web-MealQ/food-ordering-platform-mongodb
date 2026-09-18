import { useState } from "react";
import { Link, useParams } from "react-router";
import { HeartIcon } from "@/components/icons";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { getRestaurant, getRestaurantCategories, getRestaurantMenu, priceCart } from "@/features/customer/catalog";
import { MenuItemRow } from "@/features/customer/components/menu-item-row";
import { CartSummaryCard } from "@/features/customer/components/cart-summary-card";
import { BackButton } from "@/features/customer/components/page-header";
import { Rating } from "@/features/customer/components/rating";
import { SegmentedTabs } from "@/features/customer/components/segmented-tabs";
import { formatBaht, formatRange } from "@/features/customer/format";
import { useCustomer } from "@/features/customer/store";
import { chipClasses, containerClass, scrollStripClass, stickySidebarClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";
import NotFoundPage from "@/pages/not-found";

const TABS = [
  { value: "menu", label: "เมนู" },
  { value: "info", label: "ข้อมูลร้าน" },
  { value: "reviews", label: "รีวิว" },
];

function MenuTab({ restaurantId }) {
  const [filter, setFilter] = useState("bestseller");
  const menu = getRestaurantMenu(restaurantId);
  const categories = getRestaurantCategories(restaurantId);
  const filters = [{ id: "bestseller", label: "ขายดี", emoji: "🔥" }, ...categories];

  const items =
    filter === "bestseller"
      ? menu.toSorted((a, b) => Number(a.soldOut) - Number(b.soldOut) || b.weeklyOrders - a.weeklyOrders)
      : menu.filter((m) => m.category === filter);
  const heading = filter === "bestseller" ? "🔥 ขายดีสัปดาห์นี้" : filters.find((f) => f.id === filter).label;

  return (
    <div className="space-y-4">
      <ul className={scrollStripClass} aria-label="หมวดเมนู">
        {filters.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={chipClasses({ selected: filter === f.id })}
            >
              <span aria-hidden="true">{f.emoji}</span> {f.label}
            </button>
          </li>
        ))}
      </ul>
      <h2 className="text-lg font-bold text-ink">{heading}</h2>
      {/* Two columns when there is room; one beside the desktop cart sidebar until xl. */}
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <MenuItemRow menuItem={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoTab({ restaurant }) {
  const rows = [
    ["เวลาเปิด–ปิด", `${restaurant.hours.open}–${restaurant.hours.close} น.`],
    ["ที่ตั้ง", restaurant.location],
    ["จุดรับอาหาร", restaurant.pickupPoint],
    ["เบอร์โทร", restaurant.phone],
  ];
  return (
    <div className="space-y-4 lg:max-w-2xl">
      <p className="text-ink">{restaurant.about}</p>
      <dl className="divide-y divide-haze rounded-3xl bg-cream px-5">
        {rows.map(([term, detail]) => (
          <div key={term} className="flex justify-between gap-4 py-3.5">
            <dt className="text-ink-soft">{term}</dt>
            <dd className="text-right font-semibold text-ink">{detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReviewsTab({ restaurant }) {
  return (
    <div className="space-y-3">
      <p className="text-ink">
        <span className="font-display text-4xl font-black">{restaurant.rating.toFixed(1)}</span>{" "}
        <span className="text-ink-soft">จาก {restaurant.reviewCount.toLocaleString("th-TH")} รีวิว</span>
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {restaurant.reviews.map((review) => (
          <li key={review.id} className="rounded-3xl bg-cream p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">{review.author}</p>
              <p className="text-sm text-ink-soft">{review.daysAgo} วันก่อน</p>
            </div>
            <p className="text-amber" aria-label={`${review.rating} ดาว`}>
              {"★".repeat(review.rating)}
              <span className="text-haze">{"★".repeat(5 - review.rating)}</span>
            </p>
            <p className="mt-1 text-ink">{review.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RestaurantDetail() {
  const { id } = useParams();
  const restaurant = getRestaurant(id);
  usePageTitle(restaurant?.name ?? "ไม่พบร้าน");
  const { state, dispatch } = useCustomer();
  const [tab, setTab] = useState("menu");

  if (!restaurant) return <NotFoundPage />;

  const favorite = state.favorites.restaurants.includes(restaurant.id);
  const cart = state.cart.restaurantId === restaurant.id ? priceCart(state.cart) : null;
  const openLabel = restaurant.isOpen
    ? `เปิดอยู่ · ปิด ${restaurant.hours.close}`
    : `ปิดอยู่ · เปิด ${restaurant.hours.open}`;

  return (
    <>
      <main className="flex-1 pb-8 lg:pb-16">
        <div className="relative lg:mx-auto lg:max-w-6xl lg:px-8 lg:pt-8">
          <ImagePlaceholder
            label={`Cover ${restaurant.name}`}
            className="aspect-video border-x-0 border-t-0 lg:aspect-auto lg:h-80 lg:rounded-4xl lg:border-2"
          />
          <BackButton
            fallback="/customer/explore"
            className="absolute top-4 left-4 bg-white/90 shadow lg:top-12 lg:left-12"
          />
        </div>

        <div className={cx(containerClass, "relative space-y-5 lg:space-y-8")}>
          <div className="space-y-5 lg:flex lg:items-end lg:justify-between lg:gap-8 lg:space-y-0">
            <div className="space-y-5 lg:flex lg:items-end lg:gap-5 lg:space-y-0">
              <div className="-mt-10 flex items-end gap-3 lg:-mt-14">
                <ImagePlaceholder compact label="โลโก้" className="size-20 rounded-full ring-4 ring-white lg:size-28" />
                <p
                  className={cx(
                    "mb-2 rounded-full px-3 py-1 text-xs font-semibold lg:hidden",
                    restaurant.isOpen ? "bg-mint text-brand-ink" : "bg-haze text-ink-soft",
                  )}
                >
                  {openLabel}
                </p>
              </div>
              <div>
                <p
                  className={cx(
                    "mb-2 hidden w-fit rounded-full px-3 py-1 text-xs font-semibold lg:block",
                    restaurant.isOpen ? "bg-mint text-brand-ink" : "bg-haze text-ink-soft",
                  )}
                >
                  {openLabel}
                </p>
                <h1 className="text-3xl font-bold text-ink lg:text-4xl">{restaurant.name}</h1>
                <p className="mt-1 text-sm text-ink-soft lg:text-base">
                  {restaurant.category} · <Rating value={restaurant.rating} count={restaurant.reviewCount} /> ·{" "}
                  {restaurant.location}
                </p>
              </div>
            </div>

            <div className="flex gap-3 lg:w-md lg:shrink-0">
              <div className="flex-1 rounded-3xl bg-cream px-4 py-3">
                <p className="font-display text-2xl font-black text-cocoa">
                  {restaurant.isOpen ? restaurant.queueLength : "–"}
                </p>
                <p className="text-xs text-ink-soft">คิวปัจจุบัน</p>
              </div>
              <div className="flex-1 rounded-3xl bg-cream px-4 py-3">
                <p className="font-display text-2xl font-black text-cocoa">{formatRange(restaurant.waitMinutes)}</p>
                <p className="text-xs text-ink-soft">นาที (ประมาณ)</p>
              </div>
              <button
                type="button"
                aria-pressed={favorite}
                aria-label="ร้านโปรด"
                onClick={() => dispatch({ type: "favorites/toggle", kind: "restaurants", id: restaurant.id })}
                className={`grid w-16 place-items-center rounded-3xl bg-cream text-brand-ink hover:bg-haze ${focusRing}`}
              >
                <HeartIcon filled={favorite} className="size-6" />
              </button>
            </div>
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
            <div className="space-y-5">
              <div className="lg:max-w-md">
                <SegmentedTabs idPrefix="restaurant-tab" label="ข้อมูลร้าน" tabs={TABS} value={tab} onChange={setTab} />
              </div>
              <div id="restaurant-tab-panel" role="tabpanel" aria-labelledby={`restaurant-tab-${tab}`}>
                {tab === "menu" && <MenuTab restaurantId={restaurant.id} />}
                {tab === "info" && <InfoTab restaurant={restaurant} />}
                {tab === "reviews" && <ReviewsTab restaurant={restaurant} />}
              </div>
            </div>
            <aside className={cx("hidden lg:block", stickySidebarClass)}>
              <CartSummaryCard restaurantId={restaurant.id} />
            </aside>
          </div>
        </div>
      </main>

      {cart && cart.itemCount > 0 && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-haze bg-cream px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:hidden">
          <div>
            <p className="text-xs text-ink-soft">{cart.itemCount} รายการในตะกร้า</p>
            <p className="text-xl font-bold text-ink">{formatBaht(cart.subtotal)}</p>
          </div>
          <Link to="/customer/cart" className={buttonClasses({ variant: "primary", size: "md" })}>
            ดูตะกร้า
          </Link>
        </div>
      )}
    </>
  );
}

export default RestaurantDetail;
