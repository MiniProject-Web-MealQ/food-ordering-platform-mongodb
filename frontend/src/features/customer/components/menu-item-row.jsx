import { Link } from "react-router";
import { CatalogImage } from "./catalog-image";
import { cx } from "@/lib/cx";
import { getRestaurant, isOrderable } from "../catalog";
import { formatBaht } from "../format";
import { AddButton } from "./add-button";
import { Rating } from "./rating";

/**
 * Menu row used on restaurant profiles (variant "restaurant": shows description)
 * and in search / favourites (variant "search": shows restaurant, queue and rating).
 */
export function MenuItemRow({ menuItem, variant = "restaurant" }) {
  const restaurant = getRestaurant(menuItem.restaurantId);
  const orderable = isOrderable(menuItem);
  const unavailableLabel = menuItem.soldOut ? "หมด" : "ปิด";

  return (
    <div className="relative flex items-center gap-3 rounded-3xl bg-cream p-3">
      <CatalogImage
        src={menuItem.image}
        compact
        label={menuItem.shortLabel}
        className={cx("size-18 shrink-0 rounded-2xl", !orderable && "opacity-50")}
      />
      <div className={cx("min-w-0 flex-1", !orderable && "opacity-60")}>
        <p className="flex items-center gap-2 font-semibold text-ink">
          <Link
            to={`/customer/restaurants/${menuItem.restaurantId}/menu/${menuItem.id}`}
            className="truncate rounded after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
          >
            {menuItem.name}
          </Link>
          {menuItem.bestsellerRank && variant === "restaurant" && (
            <span className="shrink-0 rounded-full bg-cocoa/10 px-2 py-0.5 text-xs font-semibold text-cocoa">
              ฮิต
            </span>
          )}
        </p>
        <p className="truncate text-sm text-ink-soft">
          {variant === "restaurant" ? (
            menuItem.description
          ) : restaurant.isOpen ? (
            <>
              {restaurant.name} · คิว {restaurant.queueLength} · <Rating value={menuItem.rating} />
            </>
          ) : (
            `${restaurant.name} · ร้านปิดอยู่`
          )}
        </p>
        <p className="mt-1 font-bold text-ink">{formatBaht(menuItem.price)}</p>
      </div>
      {orderable ? (
        <AddButton menuItem={menuItem} className="relative" />
      ) : (
        <span className="relative rounded-full bg-haze px-3 py-1 text-xs font-semibold text-ink-soft">
          {unavailableLabel}
        </span>
      )}
    </div>
  );
}
