import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { CheckIcon, HeartIcon } from "@/components/icons";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { buttonClasses, focusRing, textLinkClass } from "@/components/ui/styles";
import {
  defaultSelections,
  getMenuItem,
  getRestaurant,
  isOrderable,
  missingRequiredGroups,
  unitPrice,
} from "@/features/customer/catalog";
import { BackButton } from "@/features/customer/components/page-header";
import { QtyStepper } from "@/features/customer/components/qty-stepper";
import { Rating } from "@/features/customer/components/rating";
import { formatBaht } from "@/features/customer/format";
import { useCustomer } from "@/features/customer/store";
import { containerClass, stickySidebarClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";
import NotFoundPage from "@/pages/not-found";

const optionRow =
  "flex min-h-13 cursor-pointer items-center gap-3 rounded-full border-2 px-4 transition-colors has-checked:border-brand has-checked:bg-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink";

function OptionGroup({ group, selected, onChange }) {
  function toggle(optionId) {
    if (!group.multiple) return onChange([optionId]);
    onChange(selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId]);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="w-full">
        <span className="block text-lg font-bold text-ink">{group.label}</span>
        <span className="block text-sm text-muted">
          {group.multiple ? "เลือกได้หลายอย่าง · ไม่บังคับ" : `เลือก 1 อย่าง${group.required ? " · จำเป็น" : ""}`}
        </span>
      </legend>
      {group.options.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <label key={option.id} className={cx(optionRow, "border-haze bg-cream")}>
            <input
              type={group.multiple ? "checkbox" : "radio"}
              name={group.id}
              value={option.id}
              checked={checked}
              onChange={() => toggle(option.id)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cx(
                "grid size-5 shrink-0 place-items-center border-2 transition-colors",
                group.multiple ? "rounded-md" : "rounded-full",
                checked ? "border-brand bg-brand" : "border-muted/40 bg-white",
              )}
            >
              {checked &&
                (group.multiple ? (
                  <CheckIcon className="size-3.5 text-white" strokeWidth={3.5} />
                ) : (
                  <span className="size-2 rounded-full bg-white" />
                ))}
            </span>
            <span className="flex-1 font-medium text-ink">{option.label}</span>
            {option.price > 0 && <span className="text-sm font-semibold text-ink">+{formatBaht(option.price)}</span>}
          </label>
        );
      })}
    </fieldset>
  );
}

function FoodDetail() {
  const { id: restaurantId, menuId } = useParams();
  const navigate = useNavigate();
  const menuItem = getMenuItem(menuId);
  usePageTitle(menuItem?.name ?? "ไม่พบเมนู");
  const { state, dispatch } = useCustomer();
  const [selections, setSelections] = useState(() => (menuItem ? defaultSelections(menuItem) : {}));
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  if (!menuItem || menuItem.restaurantId !== restaurantId) return <NotFoundPage />;

  const restaurant = getRestaurant(restaurantId);
  const favorite = state.favorites.menus.includes(menuItem.id);
  const orderable = isOrderable(menuItem);
  const missing = missingRequiredGroups(menuItem, selections);
  const total = unitPrice(menuItem, selections) * qty;
  const replacesCart = state.cart.items.length > 0 && state.cart.restaurantId !== restaurantId;
  const replacedName = replacesCart ? getRestaurant(state.cart.restaurantId).name : null;

  function handleAdd() {
    if (
      replacesCart &&
      !window.confirm(`ตะกร้ามีอาหารจาก${replacedName}อยู่ สั่งได้ครั้งละร้านเดียว ต้องการล้างตะกร้าแล้วเพิ่มเมนูนี้?`)
    ) {
      return;
    }
    dispatch({ type: "cart/add", menuId, selections, note, qty });
    navigate(`/customer/restaurants/${restaurantId}`);
  }

  const badges = [
    menuItem.bestsellerRank && `ฮิตอันดับ ${menuItem.bestsellerRank}`,
    ...menuItem.allergens.map((a) => `มี${a}`),
    `ทำ ~${menuItem.prepMinutes} นาที`,
  ].filter(Boolean);

  let cta = `เพิ่มลงตะกร้า · ${formatBaht(total)}`;
  if (menuItem.soldOut) cta = "เมนูนี้หมดแล้ว";
  else if (!restaurant.isOpen) cta = "ร้านปิดอยู่";
  else if (missing.length > 0) cta = `เลือก${missing[0].label}`;

  return (
    <main className="flex-1 lg:pb-16">
      <div className={cx(containerClass, "lg:grid lg:grid-cols-2 lg:items-start lg:gap-12 lg:pt-10")}>
        {/* Phones: full-bleed photo. Desktop: rounded photo that stays in view beside the options. */}
        <div className={cx("relative -mx-4 sm:-mx-6 lg:mx-0", stickySidebarClass)}>
          <ImagePlaceholder
            label={menuItem.name}
            className="aspect-square max-h-96 w-full border-x-0 border-t-0 lg:max-h-none lg:rounded-4xl lg:border-2"
          />
          <BackButton
            fallback={`/customer/restaurants/${restaurantId}`}
            className="absolute top-4 left-4 bg-white/90 shadow"
          />
          <button
            type="button"
            aria-pressed={favorite}
            aria-label="เมนูโปรด"
            onClick={() => dispatch({ type: "favorites/toggle", kind: "menus", id: menuItem.id })}
            className={`absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/90 text-brand-ink shadow hover:bg-white ${focusRing}`}
          >
            <HeartIcon filled={favorite} className="size-5" />
          </button>
        </div>

        <div className="space-y-6 pt-5 lg:pt-0">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-ink lg:text-4xl">{menuItem.name}</h1>
              <p className="text-2xl font-bold text-ink lg:text-4xl">{formatBaht(menuItem.price)}</p>
            </div>
            <p className="text-muted lg:text-lg">
              {menuItem.description} ·{" "}
              <Link to={`/customer/restaurants/${restaurantId}`} className={textLinkClass}>
                {restaurant.name}
              </Link>{" "}
              · <Rating value={menuItem.rating} count={menuItem.reviewCount} />
            </p>
            <ul className="flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <li
                  key={badge}
                  className={cx(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    index === 0 && menuItem.bestsellerRank ? "bg-cocoa/10 text-cocoa" : "bg-haze text-ink",
                  )}
                >
                  {badge}
                </li>
              ))}
            </ul>
          </div>

          {menuItem.optionGroups.map((group) => (
            <OptionGroup
              key={group.id}
              group={group}
              selected={selections[group.id]}
              onChange={(value) => setSelections((prev) => ({ ...prev, [group.id]: value }))}
            />
          ))}

          <div className="space-y-2">
            <label htmlFor="food-note" className="block text-lg font-bold text-ink">
              หมายเหตุถึงร้าน
            </label>
            <textarea
              id="food-note"
              rows={2}
              maxLength={120}
              placeholder="เช่น ไม่ใส่ผัก แยกน้ำจิ้ม"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-none rounded-3xl border-2 border-haze bg-cream px-5 py-3 text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none"
            />
          </div>

          {/* Sticks to the bottom of the screen on phones; an inline card on desktop. */}
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-haze bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-4xl lg:border-0 lg:bg-cream lg:p-4">
            <QtyStepper label="จำนวน" value={qty} min={1} onChange={setQty} />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!orderable || missing.length > 0}
              className={cx(buttonClasses({ variant: "primary", fullWidth: true }), "flex-1")}
            >
              {cta}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default FoodDetail;
