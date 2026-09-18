import { Link, useLocation } from "react-router";
import { cx } from "@/lib/cx";
import { isNavItemActive, NAV_ITEMS } from "../nav-items";

/** Phone/tablet tab bar. Desktop uses <CustomerHeader> instead. */
export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="เมนูหลัก"
      className="sticky bottom-0 z-20 border-t border-haze bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex flex-col items-center gap-1 py-3 text-xs transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
                  active ? "font-semibold text-brand-ink" : "text-muted hover:text-ink",
                )}
              >
                <item.Icon className="size-6" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
