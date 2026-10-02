import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CatalogImage } from "@/features/customer/components/catalog-image";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { getRestaurant, isOrderable } from "@/features/customer/catalog";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { Rating } from "@/features/customer/components/rating";
import { formatBaht, formatRange } from "@/features/customer/format";
import { CUISINES } from "@/features/customer/mock-data";
import { MENU_ITEMS } from "@/features/customer/catalog";
import { useCustomer } from "@/features/customer/store";
import { chipClasses, containerClass, stickySidebarClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const BUDGET_MIN = 20;
const BUDGET_MAX = 150;
const BUDGET_STEP = 5;
const SPIN_TICKS = 18;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function candidatesFor(filters, recentMenuIds) {
  return MENU_ITEMS.filter((item) => {
    const restaurant = getRestaurant(item.restaurantId);
    if (filters.cuisine !== "all" && item.cuisine !== filters.cuisine) return false;
    if (item.price > filters.budget) return false;
    if (filters.openOnly && !restaurant.isOpen) return false;
    if (filters.hideSoldOut && item.soldOut) return false;
    if (filters.noRepeat && recentMenuIds.has(item.id)) return false;
    return true;
  });
}

function pickRandom(list, avoidId) {
  const pool = list.length > 1 ? list.filter((item) => item.id !== avoidId) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

function SetupView({ filters, setFilter, spinning, reelItem, onSpin }) {
  return (
    <div className="min-w-0 w-full flex-1 bg-forest text-white">
      <div
        className={cx(
          containerClass,
          "space-y-6 pt-6 pb-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12 lg:space-y-0 lg:pt-12 lg:pb-16",
        )}
      >
        <div className={cx("space-y-6", stickySidebarClass)}>
          <header>
            <p className="text-xs font-semibold tracking-[0.3em] text-brand">RANDOM FOOD</p>
            <h1 className="mt-1 text-3xl font-bold lg:mt-3 lg:text-5xl lg:leading-tight">วันนี้กินอะไรดี?</h1>
            <p className="mt-1 text-sm text-white/75">ตั้งเงื่อนไขคร่าว ๆ แล้วให้เราเลือกให้</p>
          </header>

          <div className="space-y-4 rounded-4xl bg-white/5 p-4">
            <div
              aria-live="polite"
              aria-busy={spinning}
              className="overflow-hidden rounded-3xl border-t-4 border-brand bg-cream px-4 py-7 text-center text-ink lg:py-14"
            >
              <p className="text-xs font-semibold tracking-[0.3em] text-brand-ink">ผลลัพธ์</p>
              {reelItem ? (
                <div key={reelItem.id} className={cx(spinning && "motion-safe:animate-[reel_90ms_ease-out]")}>
                  <p className="mt-1 truncate text-2xl font-bold lg:text-4xl">{reelItem.name}</p>
                  <p className="text-sm text-ink-soft">
                    {getRestaurant(reelItem.restaurantId).name} · {formatBaht(reelItem.price)}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-2xl font-bold text-ink-soft">? ? ?</p>
              )}
            </div>
            <button
              type="button"
              onClick={onSpin}
              aria-disabled={spinning}
              className={buttonClasses({ variant: "cocoa", fullWidth: true })}
            >
              <span aria-hidden="true">🎲</span> {spinning ? "กำลังสุ่ม…" : "สุ่มอาหาร"}
            </button>
          </div>
        </div>

        <fieldset disabled={spinning} className="min-w-0 w-full space-y-6 lg:rounded-4xl lg:bg-white/5 lg:p-8">
          <legend className="sr-only">เงื่อนไขการสุ่ม</legend>
          <div>
            <p id="random-cuisine" className="mb-3 font-bold">
              ประเภทอาหาร
            </p>
            <div role="group" aria-labelledby="random-cuisine" className="flex flex-wrap gap-2">
              {[{ id: "all", label: "ทุกประเภท" }, ...CUISINES].map((cuisine) => (
                <button
                  key={cuisine.id}
                  type="button"
                  aria-pressed={filters.cuisine === cuisine.id}
                  onClick={() => setFilter("cuisine", cuisine.id)}
                  className={chipClasses({ selected: filters.cuisine === cuisine.id, tone: "dark" })}
                >
                  {cuisine.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="random-budget" className="font-bold">
              งบต่อจาน · ไม่เกิน {formatBaht(filters.budget)}
            </label>
            <input
              id="random-budget"
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={BUDGET_STEP}
              value={filters.budget}
              onChange={(e) => setFilter("budget", Number(e.target.value))}
              className="mt-3 w-full accent-brand"
            />
            <div aria-hidden="true" className="flex justify-between text-xs text-white/60">
              <span>{formatBaht(BUDGET_MIN)}</span>
              <span>{formatBaht(BUDGET_MAX)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              ["openOnly", "เฉพาะร้านที่เปิดอยู่"],
              ["hideSoldOut", "ซ่อนเมนูที่ของหมด"],
              ["noRepeat", "ไม่ซ้ำเมนูที่สั่งใน 7 วัน"],
            ].map(([key, label]) => (
              <div key={key} className="rounded-3xl bg-white/5 px-5 py-4">
                <ToggleSwitch
                  id={`random-${key}`}
                  tone="dark"
                  label={label}
                  checked={filters[key]}
                  onChange={(value) => setFilter(key, value)}
                />
              </div>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

function ResultView({ item, onRespin }) {
  const restaurant = getRestaurant(item.restaurantId);
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pt-6 pb-8 sm:px-6 lg:space-y-8 lg:px-8 lg:pt-12 lg:pb-16">
      <h1 className="text-center font-bold text-ink lg:text-2xl">
        <span aria-hidden="true">🎉</span> วันนี้คุณได้…
      </h1>
      <article className="overflow-hidden rounded-4xl bg-cream shadow-card md:grid md:grid-cols-2">
        <CatalogImage
          src={item.image}
          label={item.name}
          className="aspect-4/3 border-x-0 border-t-0 md:aspect-auto md:h-full md:min-h-72 md:border-b-0"
        />
        <div className="space-y-1 p-6 text-center md:flex md:flex-col md:justify-center md:p-10">
          <h2 className="text-2xl font-bold text-ink lg:text-4xl">{item.name}</h2>
          <p className="text-sm text-ink-soft">
            {restaurant.name} · <Rating value={item.rating} /> · คิว {restaurant.queueLength} · ~
            {formatRange(restaurant.waitMinutes)} นาที
          </p>
          <p className="pt-2 text-3xl font-bold text-ink lg:text-5xl">{formatBaht(item.price)}</p>
        </div>
      </article>
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        <button type="button" onClick={onRespin} className={buttonClasses({ variant: "cocoa-outline" })}>
          <span aria-hidden="true">🎲</span> สุ่มใหม่
        </button>
        {isOrderable(item) ? (
          <Link
            to={`/customer/restaurants/${item.restaurantId}/menu/${item.id}`}
            className={buttonClasses({ variant: "cocoa" })}
          >
            สั่งเลย
          </Link>
        ) : (
          <button type="button" disabled className={buttonClasses({ variant: "cocoa" })}>
            {item.soldOut ? "เมนูหมด" : "ร้านปิดอยู่"}
          </button>
        )}
      </div>
      <p className="text-center">
        <Link to={`/customer/restaurants/${item.restaurantId}`} className={`${textLinkClass} text-sm`}>
          ดูเมนูอื่นของร้านนี้
        </Link>
      </p>
    </div>
  );
}

function EmptyView({ filters, onWiden, onBack }) {
  const widened = Math.min(BUDGET_MAX, Math.max(filters.budget + 30, 50));
  const cuisine = CUISINES.find((c) => c.id === filters.cuisine);
  const canWiden = filters.budget < BUDGET_MAX;

  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-10 pb-8 sm:px-6 lg:pt-20">
      <div role="alert" className="space-y-4 rounded-4xl bg-white px-6 py-10 text-center shadow-card">
        <span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-haze text-3xl">
          🎲
        </span>
        <h1 className="text-2xl font-bold text-ink">ไม่มีเมนูที่ตรงเงื่อนไข</h1>
        <p className="text-ink-soft">
          งบ {formatBaht(filters.budget)}
          {cuisine && ` · ${cuisine.label}`} ตอนนี้ยังไม่มีเมนูที่ตรง — ลองขยายงบหรือเปลี่ยนประเภท
        </p>
        <div className="flex flex-col items-center gap-2">
          {canWiden && (
            <button type="button" onClick={() => onWiden(widened)} className={buttonClasses({ variant: "cocoa", size: "md" })}>
              ขยายงบเป็น {formatBaht(widened)}
            </button>
          )}
          <button type="button" onClick={onBack} className={`${textLinkClass} text-sm`}>
            กลับไปแก้เงื่อนไข
          </button>
        </div>
      </div>
    </div>
  );
}

function RandomFood() {
  usePageTitle("สุ่มอาหาร");
  const { state } = useCustomer();
  const [filters, setFilters] = useState({
    cuisine: "all",
    budget: 80,
    openOnly: true,
    hideSoldOut: true,
    noRepeat: false,
  });
  const [view, setView] = useState("setup"); // setup | spinning | result | empty
  const [reelItem, setReelItem] = useState(null);
  const [result, setResult] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function spin(activeFilters = filters) {
    if (view === "spinning") return;
    const since = Date.now() - WEEK_MS;
    const recent = new Set(
      state.orders.filter((o) => o.statusTimes.PLACED >= since).flatMap((o) => o.items.map((i) => i.menuId)),
    );
    const candidates = candidatesFor(activeFilters, recent);
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (candidates.length === 0) {
      setView("empty");
      return;
    }

    const winner = pickRandom(candidates, result?.id);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setResult(winner);
      setView("result");
      return;
    }

    // Reel slows down: each tick waits a little longer, and the last tick lands on the winner.
    setView("spinning");
    let elapsed = 0;
    timers.current = Array.from({ length: SPIN_TICKS }, (_, tick) => {
      elapsed += 50 + tick * tick * 1.2;
      const last = tick === SPIN_TICKS - 1;
      return setTimeout(() => {
        setReelItem(last ? winner : pickRandom(MENU_ITEMS));
        if (last) {
          timers.current.push(
            setTimeout(() => {
              setResult(winner);
              setView("result");
            }, 700),
          );
        }
      }, elapsed);
    });
  }

  if (view === "result") return <ResultView item={result} onRespin={() => spin()} />;
  if (view === "empty") {
    return (
      <EmptyView
        filters={filters}
        onBack={() => setView("setup")}
        onWiden={(budget) => {
          const next = { ...filters, budget };
          setFilters(next);
          spin(next);
        }}
      />
    );
  }
  return (
    <SetupView
      filters={filters}
      setFilter={setFilter}
      spinning={view === "spinning"}
      reelItem={reelItem}
      onSpin={() => spin()}
    />
  );
}

export default RandomFood;
