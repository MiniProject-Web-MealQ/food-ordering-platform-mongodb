import { Link, useNavigate, useSearchParams } from "react-router";
import { SearchIcon } from "@/components/icons";
import { focusRing } from "@/components/ui/styles";
import { MenuItemRow } from "@/features/customer/components/menu-item-row";
import { getRestaurant, isOrderable } from "@/features/customer/catalog";
import { MENU_ITEMS, RESTAURANTS } from "@/features/customer/mock-data";
import { chipClasses } from "@/features/customer/styles";
import { usePageTitle } from "@/lib/use-page-title";

const POPULAR_SEARCHES = ["กะเพรา", "ก๋วยเตี๋ยว", "ชาไทย", "มัทฉะ", "ข้าวมันไก่", "บิงซู"];

function normalize(text) {
  return text.trim().toLowerCase().replaceAll(" ", "");
}

function matches(text, query) {
  return normalize(text).includes(normalize(query));
}

function Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  usePageTitle(query ? `ค้นหา “${query}”` : "ค้นหา");

  function setQuery(value) {
    setParams(value ? { q: value } : {}, { replace: true });
  }

  const hasQuery = normalize(query).length > 0;

  const menuResults = hasQuery
    ? MENU_ITEMS.filter((m) => matches(m.name, query) || matches(getRestaurant(m.restaurantId).name, query))
        .toSorted((a, b) => Number(isOrderable(b)) - Number(isOrderable(a)) || b.rating - a.rating)
    : [];

  // Suggestions: distinct matching menu names (with how many restaurants sell them), then restaurants.
  const menuSuggestions = hasQuery
    ? Object.entries(
        Object.groupBy(
          MENU_ITEMS.filter((m) => matches(m.name, query)),
          (m) => m.name.replace(/^ข้าว/, ""),
        ),
      )
        .map(([name, items]) => ({ name, count: new Set(items.map((i) => i.restaurantId)).size }))
        .slice(0, 3)
    : [];
  const restaurantSuggestions = hasQuery
    ? RESTAURANTS.filter(
        (r) => matches(r.name, query) || MENU_ITEMS.some((m) => m.restaurantId === r.id && matches(m.name, query)),
      ).slice(0, 2)
    : [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pt-5 pb-8 sm:px-6 lg:space-y-8 lg:px-8 lg:pt-10 lg:pb-16">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="search-input" className="sr-only">
          ค้นหาเมนูหรือร้าน
        </label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-ink" />
        <input
          id="search-input"
          type="search"
          autoFocus
          enterKeyHint="search"
          autoComplete="off"
          placeholder="ค้นหาเมนูหรือร้าน"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-14 w-full rounded-full lg:h-16 lg:text-lg border-2 border-brand bg-cream pr-24 pl-13 text-ink placeholder:text-ink-soft/70 focus:ring-2 focus:ring-brand/40 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="button"
          onClick={() =>
            window.history.state?.idx > 0 ? navigate(-1) : navigate("/customer/explore", { replace: true })
          }
          className={`absolute top-1/2 right-3 -translate-y-1/2 rounded-full px-3 py-2 text-sm text-ink-soft hover:text-ink ${focusRing}`}
        >
          ยกเลิก
        </button>
      </form>

      {!hasQuery && (
        <section aria-labelledby="popular-searches" className="space-y-3">
          <h2 id="popular-searches" className="text-xs font-semibold tracking-widest text-ink-soft">
            ค้นหายอดนิยม
          </h2>
          <ul className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <li key={term}>
                <button type="button" onClick={() => setQuery(term)} className={chipClasses()}>
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(menuSuggestions.length > 0 || restaurantSuggestions.length > 0) && (
        <section aria-labelledby="search-suggestions" className="space-y-1">
          <h2 id="search-suggestions" className="text-xs font-semibold tracking-widest text-ink-soft">
            คำแนะนำ
          </h2>
          <ul className="md:grid md:grid-cols-2 md:gap-x-6">
            {menuSuggestions.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  onClick={() => setQuery(s.name)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-1 py-3 text-left hover:bg-cream ${focusRing}`}
                >
                  <SearchIcon className="size-4 shrink-0 text-ink-soft" />
                  <span className="flex-1 font-semibold text-brand-ink">{s.name}</span>
                  <span className="text-xs text-ink-soft">เมนู · {s.count} ร้าน</span>
                </button>
              </li>
            ))}
            {restaurantSuggestions.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/customer/restaurants/${r.id}`}
                  className={`flex items-center gap-3 rounded-2xl px-1 py-3 hover:bg-cream ${focusRing}`}
                >
                  <span aria-hidden="true" className="size-4 shrink-0 rounded-full bg-mint" />
                  <span className="flex-1 font-semibold text-ink">{r.name}</span>
                  <span className="text-xs text-ink-soft">
                    ร้าน · {r.isOpen ? `คิว ${r.queueLength}` : "ปิดอยู่"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasQuery && (
        <section aria-labelledby="search-results" className="space-y-3">
          <h2
            id="search-results"
            aria-live="polite"
            className="text-xs font-semibold tracking-widest text-ink-soft"
          >
            ผลการค้นหา {menuResults.length} เมนู
          </h2>
          {menuResults.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {menuResults.map((item) => (
                <li key={item.id}>
                  <MenuItemRow menuItem={item} variant="search" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl bg-cream p-6 text-center text-ink-soft">
              ไม่พบเมนูหรือร้านที่ตรงกับ “{query.trim()}”
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default Search;
