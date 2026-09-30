import { LogOut } from "lucide-react";
import { Link, useLocation } from "react-router";
import { LogoMark } from "@/components/brand/logo";
import { focusRing } from "@/components/ui/styles";
import { cx } from "@/lib/cx";
import { isMerchantNavActive, MERCHANT_NAV_ITEMS } from "../nav-items";
import { pendingCount } from "../orders";
import { useMerchant } from "../store";
import { CountBubble, StoreStatusPill } from "./status-badge";

function navLabel(item, pending) {
  return item.badge === "pending" && pending > 0 ? `${item.label} (ใหม่ ${pending} รายการ)` : item.label;
}

/**
 * Desktop navigation. lg: a slim icon rail so the queue board keeps four usable columns;
 * xl: the full sidebar with store name and labels beside the icons.
 */
export function MerchantSidebar() {
  const { pathname } = useLocation();
  const { state, dispatch } = useMerchant();
  const pending = pendingCount(state);

  return (
    <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col border-r border-haze bg-white lg:flex xl:w-64">
      <Link
        to="/merchant/dashboard"
        className={cx("mx-auto mt-6 flex items-center gap-2.5 rounded-full xl:mx-6", focusRing)}
      >
        <LogoMark className="size-10 text-lg" />
        <span className="hidden xl:block">
          <span className="block text-lg leading-tight font-semibold text-ink">MealQ</span>
          <span className="block text-xs text-ink-soft">สำหรับร้านค้า</span>
        </span>
        <span className="sr-only xl:hidden">MealQ สำหรับร้านค้า</span>
      </Link>

      <StoreStatusPill isOpen={state.store.is_open} compact className="mx-auto mt-4 xl:hidden" />
      <div className="mx-4 mt-6 hidden rounded-2xl bg-cream p-4 xl:block">
        <p className="truncate font-semibold text-ink">{state.store.name}</p>
        <StoreStatusPill isOpen={state.store.is_open} className="mt-2" />
      </div>

      <nav aria-label="เมนูร้านค้า" className="mt-6 flex-1 px-3 xl:px-4">
        <ul className="space-y-1">
          {MERCHANT_NAV_ITEMS.map((item) => {
            const active = isMerchantNavActive(item, pathname);
            const count = item.badge === "pending" ? pending : 0;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  aria-label={navLabel(item, pending)}
                  className={cx(
                    "relative flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold transition-colors xl:flex-row xl:gap-3 xl:px-4 xl:text-sm",
                    focusRing,
                    active ? "bg-mint text-ink" : "text-ink-soft hover:bg-cream hover:text-ink",
                  )}
                >
                  <item.Icon aria-hidden="true" className="size-6 xl:size-5" />
                  <span className="xl:flex-1">{item.label}</span>
                  <CountBubble count={count} className="absolute top-1.5 right-3 xl:static" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-haze p-3 xl:p-4">
        <button
          type="button"
          onClick={() => dispatch({ type: "session/logout" })}
          className={cx(
            "flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold text-ink-soft transition-colors hover:bg-cream hover:text-ink xl:flex-row xl:gap-3 xl:px-4 xl:text-sm",
            focusRing,
          )}
        >
          <LogOut aria-hidden="true" className="size-6 xl:size-5" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}

/** Phone/tablet header: brand, store name and whether it is taking orders. */
export function MerchantTopBar() {
  const { state } = useMerchant();

  return (
    <header className="sticky top-0 z-30 border-b border-haze bg-white/95 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Link to="/merchant/dashboard" aria-label="MealQ ร้านค้า หน้าภาพรวม" className={cx("rounded-full", focusRing)}>
          <LogoMark className="size-8 text-sm" />
        </Link>
        <p className="min-w-0 flex-1 truncate font-semibold text-ink">{state.store.name}</p>
        <StoreStatusPill isOpen={state.store.is_open} />
      </div>
    </header>
  );
}

/** Phone/tablet tab bar. Desktop uses <MerchantSidebar>. */
export function MerchantBottomNav() {
  const { pathname } = useLocation();
  const { state } = useMerchant();
  const pending = pendingCount(state);

  return (
    <nav
      aria-label="เมนูร้านค้า"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-haze bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {MERCHANT_NAV_ITEMS.map((item) => {
          const active = isMerchantNavActive(item, pathname);
          const count = item.badge === "pending" ? pending : 0;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                aria-label={navLabel(item, pending)}
                className={cx(
                  "relative flex flex-col items-center gap-1 py-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
                  active ? "font-semibold text-brand-ink" : "text-ink-soft hover:text-ink",
                )}
              >
                <item.Icon aria-hidden="true" className="size-6" />
                {item.label}
                <CountBubble count={count} className="absolute top-1 left-1/2 ml-2" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
