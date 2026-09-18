import { Link, useLocation } from "react-router";
import { LogoMark } from "@/components/brand/logo";
import { BagIcon, BellIcon, SearchIcon, UserIcon } from "@/components/icons";
import { focusRing } from "@/components/ui/styles";
import { cx } from "@/lib/cx";
import { priceCart } from "../catalog";
import { formatBaht } from "../format";
import { isNavItemActive, NAV_ITEMS } from "../nav-items";
import { useCustomer } from "../store";
import { containerClass } from "../styles";

const iconButton = `relative grid size-11 shrink-0 place-items-center rounded-full ${focusRing}`;

/** Desktop top bar (lg and up). Phones and tablets use <BottomNav>. */
export function CustomerHeader() {
  const { pathname } = useLocation();
  const { state } = useCustomer();
  const cart = priceCart(state.cart);
  const hasUnread = state.notifications.some((n) => !n.read);
  const profile = NAV_ITEMS.at(-1);
  const mainItems = NAV_ITEMS.slice(0, -1);

  return (
    <header className="sticky top-0 z-30 hidden border-b border-haze bg-white/90 backdrop-blur-md lg:block">
      <div className={cx(containerClass, "flex h-18 items-center gap-4 xl:gap-6")}>
        <Link to="/customer" className={`flex shrink-0 items-center gap-2.5 rounded-full ${focusRing}`}>
          <LogoMark className="size-9 text-base" />
          <span className="text-xl font-semibold text-ink">MealQ</span>
        </Link>

        <nav aria-label="เมนูหลัก">
          <ul className="flex items-center gap-1">
            {mainItems.map((item) => {
              const active = isNavItemActive(item, pathname);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                        aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-2 rounded-full px-3.5 py-2 font-medium whitespace-nowrap transition-colors",
                      focusRing,
                      active ? "bg-mint text-ink" : "text-muted hover:bg-cream hover:text-ink",
                    )}
                  >
                    <item.Icon className="size-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div aria-hidden="true" className="flex-1" />

        {/* Full search box when there is room (xl); an icon button on smaller laptops. */}
        <Link
          to="/customer/search"
          className={`hidden h-11 w-72 items-center gap-2.5 rounded-full bg-cream px-4 text-sm whitespace-nowrap text-muted ring-1 ring-haze hover:bg-haze xl:flex ${focusRing}`}
        >
          <SearchIcon className="size-4.5" />
          ค้นหาเมนู ร้าน หรือประเภทอาหาร
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/customer/search"
            aria-label="ค้นหา"
            className={cx(iconButton, "bg-cream text-ink hover:bg-haze xl:hidden")}
          >
            <SearchIcon className="size-5" />
          </Link>
          <Link
            to="/customer/notifications"
            aria-label={hasUnread ? "การแจ้งเตือน มีรายการใหม่" : "การแจ้งเตือน"}
            className={cx(iconButton, "bg-cream text-ink hover:bg-haze")}
          >
            <BellIcon className="size-5" />
            {hasUnread && (
              <span aria-hidden="true" className="absolute top-2.5 right-3 size-2 rounded-full bg-alert" />
            )}
          </Link>
          <Link
            to="/customer/cart"
            className={`flex h-11 items-center gap-2 rounded-full bg-forest pr-4 pl-3.5 text-sm font-semibold whitespace-nowrap text-white hover:bg-forest/90 ${focusRing}`}
          >
            <BagIcon className="size-5" />
            <span className="sr-only">ตะกร้า</span>
            {cart.itemCount > 0 ? (
              <>
                <span className="xl:hidden">{cart.itemCount}</span>
                <span className="max-xl:hidden">
                  {cart.itemCount} ชิ้น · {formatBaht(cart.subtotal)}
                </span>
              </>
            ) : (
              <span aria-hidden="true">ตะกร้า</span>
            )}
          </Link>
          <Link
            to={profile.to}
            aria-label={profile.label}
            aria-current={isNavItemActive(profile, pathname) ? "page" : undefined}
            className={cx(
              iconButton,
              isNavItemActive(profile, pathname) ? "bg-mint text-ink" : "bg-cream text-ink hover:bg-haze",
            )}
          >
            <UserIcon className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
