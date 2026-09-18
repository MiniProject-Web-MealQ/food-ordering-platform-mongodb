import { Link } from "react-router";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { cx } from "@/lib/cx";
import { getRestaurantMenu } from "../catalog";
import { formatDistance, formatRange } from "../format";
import { Rating } from "./rating";

function QueueBadge({ restaurant }) {
  return restaurant.isOpen ? (
    <span className="shrink-0 rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-brand-ink">
      คิว {restaurant.queueLength}
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-haze px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
      ปิดอยู่
    </span>
  );
}

const linkOverlay =
  "rounded after:absolute after:inset-0 after:rounded-4xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink";

/** Large card with cover photo, for the explore list. */
export function RestaurantCard({ restaurant }) {
  const menu = getRestaurantMenu(restaurant.id);
  const highlights = menu.filter((m) => !m.soldOut).toSorted((a, b) => b.weeklyOrders - a.weeklyOrders);
  const shown = highlights.slice(0, 2);

  return (
    <article
      className={cx(
        "relative overflow-hidden rounded-4xl bg-cream ring-1 ring-haze transition-shadow hover:shadow-card",
        !restaurant.isOpen && "opacity-70",
      )}
    >
      <ImagePlaceholder label={`${restaurant.name} cover`} className="aspect-16/7 border-x-0 border-t-0" />
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-lg font-bold text-ink">
            <Link to={`/customer/restaurants/${restaurant.id}`} className={linkOverlay}>
              {restaurant.name}
            </Link>
          </h3>
          <QueueBadge restaurant={restaurant} />
        </div>
        <p className="text-sm text-ink-soft">
          {restaurant.category} · <Rating value={restaurant.rating} count={restaurant.reviewCount} />
          {restaurant.isOpen && <> · ~{formatRange(restaurant.waitMinutes)} นาที</>}
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="เมนูแนะนำ">
          {shown.map((m) => (
            <li key={m.id} className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-cocoa">
              {m.name.replace(/^ข้าว/, "")}
            </li>
          ))}
          {menu.length > shown.length && (
            <li className="rounded-full bg-haze px-3 py-1 text-xs font-semibold text-ink-soft">
              +{menu.length - shown.length} เมนู
            </li>
          )}
        </ul>
      </div>
    </article>
  );
}

/** Compact row, for "ร้านใกล้คุณ" and favourites. */
export function RestaurantRow({ restaurant, meta, trailing }) {
  return (
    <article className="relative flex items-center gap-3 rounded-3xl bg-cream p-3 ring-1 ring-haze">
      <ImagePlaceholder
        compact
        label={restaurant.name}
        className={cx("size-18 shrink-0 rounded-2xl", !restaurant.isOpen && "opacity-50")}
      />
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 font-bold text-ink">
          <Link to={`/customer/restaurants/${restaurant.id}`} className={cx("truncate", linkOverlay, "after:rounded-3xl")}>
            {restaurant.name}
          </Link>
          <span
            className={cx(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
              restaurant.isOpen ? "bg-mint text-brand-ink" : "bg-haze text-ink-soft",
            )}
          >
            {restaurant.isOpen ? "เปิด" : "ปิด"}
          </span>
        </h3>
        <p className="truncate text-sm text-ink-soft">
          {restaurant.category} · <Rating value={restaurant.rating} count={restaurant.reviewCount} /> ·{" "}
          {formatDistance(restaurant.distance)}
        </p>
        {meta ?? (
          restaurant.isOpen && (
            <p className="mt-0.5 text-sm font-semibold text-brand-ink">
              คิว {restaurant.queueLength} คน{" "}
              <span className="font-normal text-ink-soft">~{formatRange(restaurant.waitMinutes)} นาที</span>
            </p>
          )
        )}
      </div>
      {trailing && <div className="relative">{trailing}</div>}
    </article>
  );
}
