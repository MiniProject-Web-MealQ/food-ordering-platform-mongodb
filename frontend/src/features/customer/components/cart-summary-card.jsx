import { Link } from "react-router";
import { BagIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/styles";
import { getRestaurant, priceCart } from "../catalog";
import { formatBaht } from "../format";
import { useCustomer } from "../store";

/** Desktop sidebar on a restaurant page: what is in the cart for this restaurant. */
export function CartSummaryCard({ restaurantId }) {
  const { state } = useCustomer();
  const sameRestaurant = state.cart.restaurantId === restaurantId;
  const cart = priceCart(state.cart);
  const otherRestaurant = !sameRestaurant && cart.lines.length > 0 ? getRestaurant(state.cart.restaurantId) : null;

  return (
    <section aria-labelledby="cart-summary-title" className="rounded-4xl bg-cream p-6 ring-1 ring-haze">
      <h2 id="cart-summary-title" className="flex items-center gap-2 text-lg font-bold text-ink">
        <BagIcon className="size-5" /> ตะกร้าของคุณ
      </h2>

      {sameRestaurant && cart.lines.length > 0 ? (
        <>
          <ul className="mt-4 space-y-3 text-sm">
            {cart.lines.map((line) => (
              <li key={line.key} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-ink">
                    {line.qty}× {line.menuItem.name}
                  </span>
                  {line.optionLabels.length > 0 && (
                    <span className="block truncate text-xs text-ink-soft">{line.optionLabels.join(" · ")}</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-ink">{formatBaht(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-baseline justify-between border-t border-haze pt-4">
            <span className="text-ink-soft">ยอดรวมอาหาร</span>
            <span className="text-2xl font-bold text-ink">{formatBaht(cart.subtotal)}</span>
          </p>
          <Link to="/customer/cart" className={`${buttonClasses({ variant: "cocoa", fullWidth: true })} mt-4`}>
            ดูตะกร้า
          </Link>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">
          {otherRestaurant
            ? `ตะกร้ามีอาหารจาก${otherRestaurant.name}อยู่ สั่งได้ครั้งละร้านเดียว`
            : "ยังไม่มีเมนูในตะกร้า กด + ที่เมนูเพื่อเริ่มสั่ง"}
        </p>
      )}
    </section>
  );
}
