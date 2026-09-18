import { useState } from "react";
import { HeartIcon } from "@/components/icons";
import { focusRing } from "@/components/ui/styles";
import { getMenuItem, getRestaurant } from "@/features/customer/catalog";
import { MenuItemRow } from "@/features/customer/components/menu-item-row";
import { PageHeader } from "@/features/customer/components/page-header";
import { RestaurantRow } from "@/features/customer/components/restaurant-card";
import { SegmentedTabs } from "@/features/customer/components/segmented-tabs";
import { useCustomer } from "@/features/customer/store";
import { containerClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function UnfavoriteButton({ label, onClick }) {
  return (
    <button
      type="button"
      aria-pressed="true"
      aria-label={`เอา ${label} ออกจากรายการโปรด`}
      onClick={onClick}
      className={`grid size-10 place-items-center rounded-full text-brand-ink hover:bg-haze ${focusRing}`}
    >
      <HeartIcon filled className="size-6" />
    </button>
  );
}

function Favorites() {
  usePageTitle("ร้านโปรด");
  const { state, dispatch } = useCustomer();
  const [tab, setTab] = useState("restaurants");
  const restaurants = state.favorites.restaurants.map(getRestaurant).filter(Boolean);
  const menus = state.favorites.menus.map(getMenuItem).filter(Boolean);

  const orderCount = (restaurantId) => state.orders.filter((o) => o.restaurantId === restaurantId).length;
  const toggle = (kind, id) => dispatch({ type: "favorites/toggle", kind, id });

  return (
    <main className={cx(containerClass, "flex-1 pb-8 lg:pb-16")}>
      <PageHeader title="ร้านโปรด" fallback="/customer/profile" />
      <div className="space-y-4 lg:space-y-6">
        <div className="lg:max-w-md">
          <SegmentedTabs
            idPrefix="favorites-tab"
            label="รายการโปรด"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "restaurants", label: `ร้านอาหาร ${restaurants.length}` },
              { value: "menus", label: `เมนู ${menus.length}` },
            ]}
          />
        </div>

        <ul id="favorites-tab-panel" role="tabpanel" aria-labelledby={`favorites-tab-${tab}`} className="grid gap-3 md:grid-cols-2 lg:gap-4">
          {tab === "restaurants" &&
            restaurants.map((restaurant) => (
              <li key={restaurant.id}>
                <RestaurantRow
                  restaurant={restaurant}
                  meta={
                    <>
                      <p className="sr-only">
                        {restaurant.isOpen ? "เปิดอยู่" : "ปิดอยู่"}
                      </p>
                      <p className="text-sm font-semibold text-brand-ink">สั่งไป {orderCount(restaurant.id)} ครั้ง</p>
                    </>
                  }
                  trailing={<UnfavoriteButton label={restaurant.name} onClick={() => toggle("restaurants", restaurant.id)} />}
                />
              </li>
            ))}
          {tab === "menus" &&
            menus.map((menuItem) => (
              <li key={menuItem.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <MenuItemRow menuItem={menuItem} variant="search" />
                </div>
                <UnfavoriteButton label={menuItem.name} onClick={() => toggle("menus", menuItem.id)} />
              </li>
            ))}
          {(tab === "restaurants" ? restaurants : menus).length === 0 && (
            <li className="rounded-3xl bg-cream p-6 text-center text-muted md:col-span-2">
              ยังไม่มีรายการโปรด กดรูปหัวใจที่หน้าร้านเพื่อบันทึกไว้
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}

export default Favorites;
