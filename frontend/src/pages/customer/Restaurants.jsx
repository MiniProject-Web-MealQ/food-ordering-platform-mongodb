import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { SearchIcon, SlidersIcon, XIcon } from "@/components/icons";
import { focusRing } from "@/components/ui/styles";
import { getRestaurantCategories } from "@/features/customer/catalog";
import { RestaurantCard } from "@/features/customer/components/restaurant-card";
import { MENU_CATEGORIES, RESTAURANTS } from "@/features/customer/catalog";
import { chipClasses, containerClass, scrollStripClass, stickySidebarClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";
import { distanceMeters } from "@/features/customer/location";

const TOGGLE_FILTERS = [
  { param: "open", label: "เปิดอยู่", test: (r) => r.isOpen },
  { param: "shortQueue", label: "คิวน้อยกว่า 5", test: (r) => r.isOpen && r.queueLength < 5 },
  { param: "topRated", label: "★ 4.5+", test: (r) => r.rating >= 4.5 },
];

const SORTS = [
  { value: "queue", label: "คิวสั้นสุด", compare: (a, b) => a.queueLength - b.queueLength },
  { value: "distance", label: "ใกล้สุด", compare: (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || 0 },
  { value: "rating", label: "คะแนนสูงสุด", compare: (a, b) => b.rating - a.rating },
];

function Restaurants() {
  usePageTitle("ค้นหาร้าน");
  const [params, setParams] = useSearchParams();
  const [showSort, setShowSort] = useState(false);
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const category = params.get("category");
  const sort = SORTS.find((s) => s.value === params.get("sort") && (s.value !== "distance" || position)) ?? SORTS[0];
  const activeToggles = TOGGLE_FILTERS.filter((f) => params.get(f.param) === "1");

  function update(key, value) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }

  function chooseSort(value) {
    if (value !== "distance" || position) { update("sort", value); return; }
    if (!navigator.geolocation) { setLocationError("เบราว์เซอร์นี้ไม่รองรับตำแหน่ง"); return; }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPosition({ latitude: coords.latitude, longitude: coords.longitude });
      setLocating(false);
      update("sort", "distance");
    }, () => { setLocationError("อ่านตำแหน่งไม่ได้ กรุณาอนุญาตตำแหน่งแล้วลองอีกครั้ง"); setLocating(false); }, { timeout: 10000, maximumAge: 60000 });
  }

  const results = RESTAURANTS.map((restaurant) => ({ ...restaurant, distance: distanceMeters(position, restaurant.coordinates) })).filter(
    (r) =>
      activeToggles.every((f) => f.test(r)) &&
      (!category || getRestaurantCategories(r.id).some((c) => c.id === category)),
  ).toSorted((a, b) => Number(b.isOpen) - Number(a.isOpen) || sort.compare(a, b));

  return (
    <div className={cx(containerClass, "pt-6 pb-8 lg:pt-10 lg:pb-16")}>
      <h1 className="text-3xl font-bold text-ink lg:text-4xl">ค้นหาร้าน</h1>

      <div className="mt-5 lg:mt-8 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className={cx("space-y-5 lg:rounded-4xl lg:bg-cream lg:p-6", stickySidebarClass)}>
          <Link
            to="/customer/search"
            className={`flex h-13 items-center gap-3 rounded-full bg-cream px-5 text-ink-soft ring-1 ring-haze hover:bg-haze lg:h-12 lg:bg-white lg:text-sm ${focusRing}`}
          >
            <SearchIcon className="size-5" />
            ร้าน เมนู หรือประเภทอาหาร
          </Link>

          <div className="space-y-3">
            <p aria-hidden="true" className="hidden font-bold text-ink lg:block">
              ตัวกรอง
            </p>
            <ul
              className={cx(scrollStripClass, "lg:mx-0 lg:flex-wrap lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-0")}
              aria-label="ตัวกรอง"
            >
              <li className="lg:hidden">
                <button
                  type="button"
                  aria-expanded={showSort}
                  aria-controls="explore-sort"
                  onClick={() => setShowSort((v) => !v)}
                  className={chipClasses({ selected: true })}
                >
                  <SlidersIcon className="size-4" />
                  ตัวกรอง{activeToggles.length > 0 && ` ${activeToggles.length}`}
                </button>
              </li>
              {TOGGLE_FILTERS.map((filter) => {
                const on = params.get(filter.param) === "1";
                return (
                  <li key={filter.param}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => update(filter.param, on ? null : "1")}
                      className={chipClasses({ tone: on ? "applied" : "light" })}
                    >
                      {filter.label}
                      {on && <XIcon className="size-3.5" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Phones open the sort options from the ตัวกรอง chip; desktop keeps them visible in the sidebar. */}
            <fieldset
              id="explore-sort"
              className={cx(
                "rounded-3xl bg-cream p-4 ring-1 ring-haze lg:block lg:bg-transparent lg:p-0 lg:pt-2 lg:ring-0",
                !showSort && "hidden",
              )}
            >
              <legend className="sr-only">เรียงลำดับ</legend>
              <p aria-hidden="true" className="mb-2 text-sm font-semibold text-ink lg:text-base lg:font-bold">
                เรียงตาม
              </p>
              <div className="flex flex-wrap gap-2">
                {SORTS.map((option) => (
                  <label
                    key={option.value}
                    className={cx(
                      chipClasses({ selected: option === sort }),
                      "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name="sort"
                      value={option.value}
                      checked={option === sort}
                      disabled={locating || (option.value === "distance" && !RESTAURANTS.some((restaurant) => Number.isFinite(restaurant.coordinates?.latitude) && Number.isFinite(restaurant.coordinates?.longitude)))}
                      onChange={() => chooseSort(option.value)}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {!RESTAURANTS.some((restaurant) => Number.isFinite(restaurant.coordinates?.latitude)) && <p className="mt-2 text-xs text-ink-soft">ยังไม่มีร้านระบุพิกัดสำหรับเรียงใกล้สุด</p>}
              {locating && <p role="status" className="mt-2 text-xs">กำลังอ่านตำแหน่ง…</p>}
              {locationError && <p role="alert" className="mt-2 text-xs text-danger">{locationError}</p>}
            </fieldset>
          </div>

          <div className="space-y-3">
            <p aria-hidden="true" className="hidden font-bold text-ink lg:block">
              ประเภทอาหาร
            </p>
            <ul className="grid grid-cols-4 gap-3 lg:grid-cols-2" aria-label="ประเภทอาหาร">
              {MENU_CATEGORIES.map((c) => {
                const on = category === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => update("category", on ? null : c.id)}
                      className={cx(
                        "group flex w-full flex-col items-center gap-2 rounded-2xl text-xs text-ink lg:text-sm",
                        focusRing,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          "grid aspect-square w-full place-items-center rounded-2xl text-3xl transition-colors lg:aspect-4/3",
                          on ? "bg-leaf ring-2 ring-brand" : "bg-cream ring-1 ring-haze group-hover:bg-haze lg:bg-white",
                        )}
                      >
                        {c.emoji}
                      </span>
                      <span className={on ? "font-bold" : undefined}>{c.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <section aria-labelledby="explore-results" className="mt-5 space-y-4 lg:mt-0">
          <h2 id="explore-results" aria-live="polite" className="text-xl font-bold text-ink lg:text-2xl">
            {results.length} ร้าน · เรียงตาม{sort.label}
          </h2>
          {results.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
              {results.map((restaurant) => (
                <li key={restaurant.id}>
                  <RestaurantCard restaurant={restaurant} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl bg-cream p-6 text-center">
              <p className="font-semibold text-ink">ไม่มีร้านที่ตรงกับตัวกรอง</p>
              <button
                type="button"
                onClick={() => setParams({}, { replace: true })}
                className={`mt-3 rounded font-semibold text-brand-ink underline-offset-4 hover:underline ${focusRing}`}
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Restaurants;
