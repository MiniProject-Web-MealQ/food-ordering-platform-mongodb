import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { InfoIcon, LockIcon } from "@/components/icons";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { getRestaurant, nextQueueNumber, priceCart } from "@/features/customer/catalog";
import { PageHeader } from "@/features/customer/components/page-header";
import { formatBaht, formatClock } from "@/features/customer/format";
import { PAYMENT_METHODS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { containerClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const STEPS = ["ตะกร้า", "ตรวจสอบและจ่าย", "ชำระเงิน", "รับอาหาร"];
const CURRENT_STEP = 2;

function Checkout() {
  usePageTitle("ชำระเงิน");
  const navigate = useNavigate();
  const { state } = useCustomer();
  const [method, setMethod] = useState(state.settings.paymentMethod);
  // Read once so the estimate doesn't shift while the customer is looking at it.
  const [now] = useState(() => Date.now());
  const priced = priceCart(state.cart);

  if (priced.lines.length === 0) return <Navigate to="/customer/cart" replace />;

  const restaurant = getRestaurant(state.cart.restaurantId);
  const queueNumber = nextQueueNumber(restaurant, state.orders);
  const readyAt = now + restaurant.waitMinutes[1] * 60_000;
  const selected = PAYMENT_METHODS.find((m) => m.id === method);
  const payLabel = `จ่าย ${formatBaht(priced.total)} ด้วย ${selected.cta}`;

  function handleSubmit(event) {
    event.preventDefault();
    navigate("/customer/checkout/payment", { state: { method } });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <main className={cx(containerClass, "flex-1 pb-8 lg:pb-16")}>
        <PageHeader title="ชำระเงิน" fallback="/customer/cart" />

        {/* Phones stack everything; desktop pins the order summary + pay button in a right column. */}
        <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-5 lg:space-y-0">
          <div className="lg:col-start-1">
            <ol className="grid grid-cols-4 gap-1.5" aria-label="ขั้นตอนการสั่ง">
              {STEPS.map((step, index) => (
                <li
                  key={step}
                  aria-current={index + 1 === CURRENT_STEP ? "step" : undefined}
                  className={cx("h-1.5 rounded-full", index < CURRENT_STEP ? "bg-brand" : "bg-haze")}
                >
                  <span className="sr-only">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-ink-soft">
              ขั้นที่ {CURRENT_STEP} จาก {STEPS.length} · {STEPS[CURRENT_STEP - 1]}
            </p>
          </div>

          <section className="space-y-3 rounded-3xl bg-cream p-5 lg:col-start-1 lg:p-6">
            <p className="text-sm text-ink">
              {restaurant.name} · {restaurant.location} {restaurant.pickupPoint}
            </p>
            <p className="text-sm font-semibold text-ink">
              คิวประมาณ #{queueNumber} · พร้อมประมาณ {formatClock(readyAt)}
            </p>
            <p className="flex gap-2 rounded-2xl bg-haze px-4 py-3 text-xs text-ink-soft">
              <InfoIcon className="size-4 shrink-0" />
              เวลาเป็นค่าประมาณจากคิวและเวลาทำเฉลี่ย ไม่ใช่เวลารับประกัน
            </p>
          </section>

          <section
            aria-labelledby="checkout-items"
            className="rounded-3xl bg-cream p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:p-6"
          >
            <div className="flex items-baseline justify-between">
              <h2 id="checkout-items" className="font-bold text-ink">
                รายการ {priced.lines.length} อย่าง
              </h2>
              <Link to="/customer/cart" className={`${textLinkClass} text-sm`}>
                แก้ไข
              </Link>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {priced.lines.map((line) => (
                <li key={line.key} className="flex justify-between gap-3">
                  <span>
                    {line.qty}× {line.menuItem.name}
                    {line.optionLabels.length > 0 && ` (${line.optionLabels.join(", ")})`}
                  </span>
                  <span>{formatBaht(line.lineTotal)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 text-ink-soft">
                <span>ค่าบริการ</span>
                <span>{formatBaht(priced.serviceFee)}</span>
              </li>
              {priced.coupon && (
                <li className="flex justify-between gap-3 text-brand-ink">
                  <span>ส่วนลด {priced.coupon.code}</span>
                  <span>−{formatBaht(priced.discount)}</span>
                </li>
              )}
            </ul>
            <p className="mt-3 flex items-baseline justify-between border-t border-haze pt-3">
              <span className="font-bold text-ink">ยอดชำระ</span>
              <span className="text-2xl font-bold text-ink">{formatBaht(priced.total)}</span>
            </p>
            <button type="submit" className={cx(buttonClasses({ variant: "primary", fullWidth: true }), "mt-5 max-lg:hidden")}>
              {payLabel}
            </button>
          </section>

          <fieldset className="space-y-3 lg:col-start-1">
            <legend className="mb-3 font-bold text-ink">วิธีชำระเงิน</legend>
            {PAYMENT_METHODS.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-4 rounded-3xl border-2 border-haze bg-cream px-5 py-4 transition-colors has-checked:border-brand has-checked:bg-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
              >
                <input
                  type="radio"
                  name="payment"
                  value={option.id}
                  checked={method === option.id}
                  onChange={() => setMethod(option.id)}
                  className="size-5 shrink-0 accent-brand"
                />
                <span>
                  <span className="block font-semibold text-ink">{option.label}</span>
                  <span className="block text-xs text-ink-soft">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <p className="flex gap-3 rounded-3xl bg-mint/60 px-5 py-4 text-xs text-ink lg:col-start-1">
            <LockIcon className="size-4 shrink-0" />
            ชำระผ่านผู้ให้บริการที่ผ่านมาตรฐาน PCI-DSS · MealQ ไม่เก็บเลขบัตรของคุณ
          </p>
        </div>
      </main>

      <div className="sticky bottom-0 z-10 border-t border-haze bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:hidden">
        <button type="submit" className={buttonClasses({ variant: "primary", fullWidth: true })}>
          {payLabel}
        </button>
      </div>
    </form>
  );
}

export default Checkout;
