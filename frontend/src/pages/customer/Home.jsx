import { Link } from "react-router";
import { BagIcon, BellIcon, SearchIcon } from "@/components/icons";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { buttonClasses, focusRing, textLinkClass } from "@/components/ui/styles";
import { getRestaurant, getWeeklyBestsellers, isActiveOrder, priceCart } from "@/features/customer/catalog";
import { ActiveOrderCard } from "@/features/customer/components/active-order-card";
import { AddButton } from "@/features/customer/components/add-button";
import { Rating } from "@/features/customer/components/rating";
import { RestaurantRow } from "@/features/customer/components/restaurant-card";
import { chipClasses, containerClass, scrollStripClass } from "@/features/customer/styles";
import { formatBaht, greeting } from "@/features/customer/format";
import { MENU_CATEGORIES, RESTAURANTS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const iconButton = `relative grid size-11 place-items-center rounded-full ${focusRing}`;

function Home() {
  usePageTitle("หน้าแรก");
  const { state } = useCustomer();
  const activeOrder = state.orders.find(isActiveOrder);
  const cartCount = priceCart(state.cart).itemCount;
  const hasUnread = state.notifications.some((n) => !n.read);
  const bestsellers = getWeeklyBestsellers();
  const nearby = RESTAURANTS.toSorted((a, b) => a.distance - b.distance).slice(0, 6);

  return (
    <div className={cx(containerClass, "space-y-6 pt-5 pb-8 lg:space-y-12 lg:pt-10 lg:pb-16")}>
      {/* Mobile: header, search, order card, chips. Desktop: greeting/search/chips left, order card right. */}
      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-x-12 lg:gap-y-6 lg:space-y-0">
        <header className="flex items-center gap-3 lg:col-start-1">
          <span aria-hidden="true" className="size-11 shrink-0 rounded-full bg-leaf lg:hidden" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-soft lg:text-lg">{greeting()}</p>
            <h1 className="text-lg font-bold text-ink lg:text-5xl lg:leading-tight">วันนี้กินอะไรดี?</h1>
          </div>
          <Link
            to="/customer/notifications"
            aria-label={hasUnread ? "การแจ้งเตือน มีรายการใหม่" : "การแจ้งเตือน"}
            className={`${iconButton} bg-cream text-ink hover:bg-haze lg:hidden`}
          >
            <BellIcon className="size-5" />
            {hasUnread && (
              <span aria-hidden="true" className="absolute top-2.5 right-3 size-2 rounded-full bg-alert" />
            )}
          </Link>
          <Link
            to="/customer/cart"
            aria-label={`ตะกร้า ${cartCount} ชิ้น`}
            className={`${iconButton} bg-forest text-white hover:bg-forest/90 lg:hidden`}
          >
            <BagIcon className="size-5" />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-alert text-xs font-bold text-white ring-2 ring-white"
              >
                {cartCount}
              </span>
            )}
          </Link>
        </header>

        <Link
          to="/customer/search"
          className={`flex h-13 items-center gap-3 rounded-full bg-cream px-5 text-ink-soft ring-1 ring-haze hover:bg-haze lg:col-start-1 lg:h-15 lg:text-lg ${focusRing}`}
        >
          <SearchIcon className="size-5" />
          ค้นหาเมนู ร้าน หรือประเภทอาหาร
        </Link>

        <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
          {activeOrder ? (
            <ActiveOrderCard order={activeOrder} />
          ) : (
            <div className="hidden rounded-4xl bg-mint p-8 lg:block">
              <p className="text-2xl font-bold text-ink">ยังไม่มีออเดอร์ที่กำลังทำ</p>
              <p className="mt-1 text-ink-soft">คิดไม่ออกว่าจะกินอะไร ให้เราสุ่มให้ได้เลย</p>
              <Link to="/customer/random" className={cx(buttonClasses({ variant: "primary", size: "md" }), "mt-5")}>
                <span aria-hidden="true">🎲</span> สุ่มอาหาร
              </Link>
            </div>
          )}
        </div>

        <nav aria-label="ประเภทอาหาร" className="lg:col-start-1">
          <ul className={cx(scrollStripClass, "lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0")}>
            <li>
              <Link to="/customer/random" className={chipClasses({ tone: "highlight" })}>
                <span aria-hidden="true">🎲</span> สุ่มให้หน่อย
              </Link>
            </li>
            {MENU_CATEGORIES.map((category) => (
              <li key={category.id}>
                <Link to={`/customer/explore?category=${category.id}`} className={chipClasses()}>
                  <span aria-hidden="true">{category.emoji}</span> {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <section aria-labelledby="bestsellers-title" className="space-y-3 lg:space-y-5">
        <h2 id="bestsellers-title" className="text-xl font-bold text-ink lg:text-3xl">
          <span aria-hidden="true">🔥</span> เมนูขายดีประจำสัปดาห์
        </h2>
        <ul
          // Scrolling strip on phones; a plain grid from sm up (not built on scrollStripClass, whose sm bleed would conflict).
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-6"
        >
          {bestsellers.map((item) => (
            <li
              key={item.id}
              className="relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-cream ring-1 ring-haze transition-shadow hover:shadow-card sm:w-auto"
            >
              <ImagePlaceholder label={item.name} className="aspect-4/3 border-x-0 border-t-0" />
              <div className="flex flex-1 flex-col gap-1 p-3">
                <h3 className="truncate font-semibold text-ink">
                  <Link
                    to={`/customer/restaurants/${item.restaurantId}/menu/${item.id}`}
                    className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
                  >
                    {item.name}
                  </Link>
                </h3>
                <p className="line-clamp-2 min-h-10 text-xs text-ink-soft">
                  {getRestaurant(item.restaurantId).name} · <Rating value={item.rating} /> ·{" "}
                  {item.weeklyOrders} ออเดอร์
                </p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <p className="text-lg font-bold text-ink">{formatBaht(item.price)}</p>
                  <AddButton menuItem={item} className="relative" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="nearby-title" className="space-y-3 lg:space-y-5">
        <div className="flex items-baseline justify-between">
          <h2 id="nearby-title" className="text-xl font-bold text-ink lg:text-3xl">
            ร้านใกล้คุณ
          </h2>
          <Link to="/customer/explore?sort=distance" className={`${textLinkClass} text-sm lg:text-base`}>
            ดูทั้งหมด
          </Link>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 lg:gap-4">
          {nearby.map((restaurant, index) => (
            // Phones show the four closest; wider screens fill a 2-column grid of six.
            <li key={restaurant.id} className={index >= 4 ? "max-md:hidden" : undefined}>
              <RestaurantRow restaurant={restaurant} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default Home;
