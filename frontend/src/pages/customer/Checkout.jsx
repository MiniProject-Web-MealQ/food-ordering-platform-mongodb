import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { InfoIcon, LockIcon } from "@/components/icons";
import { buttonClasses, textLinkClass } from "@/components/ui/styles";
import { CONFIG, getRestaurant, missingRequiredGroups, nextQueueNumber, priceCart } from "@/features/customer/catalog";
import { PageHeader } from "@/features/customer/components/page-header";
import { formatBaht, formatClock } from "@/features/customer/format";
import { PAYMENT_METHODS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { containerClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";
import { checkoutAttempt, finishCheckout, pendingSubmittedCheckout, submittedCheckout } from "@/features/customer/checkout-attempt";
import { CouponSelector } from "@/features/customer/components/coupon-details";

const STEPS = ["ตะกร้า", "ตรวจสอบและจ่าย", "ชำระเงิน", "รับอาหาร"];
const CURRENT_STEP = 2;

function Checkout() {
  usePageTitle("ชำระเงิน");
  const navigate = useNavigate();
  const { state, capabilities, couponsLoading, couponsError } = useCustomer();
  const methods = PAYMENT_METHODS.filter((option) => capabilities.paymentMethods.includes(option.id));
  const [method, setMethod] = useState(methods.some((option) => option.id === state.settings.paymentMethod) ? state.settings.paymentMethod : methods[0]?.id);
  // Read once so the estimate doesn't shift while the customer is looking at it.
  const [now] = useState(() => Date.now());
  const [submitError, setSubmitError] = useState(null);
  const [clearedReceipt, setClearedReceipt] = useState(null);
  const priced = priceCart(state.cart, state.coupons);
  const recovery = submittedCheckout(state.cart, method, state.user?.id);
  const storedPending = pendingSubmittedCheckout(state.user?.id);
  const pending = storedPending?.key === clearedReceipt ? null : storedPending;

  if (priced.lines.length === 0) return <Navigate to="/customer/cart" replace />;

  const restaurant = getRestaurant(state.cart.restaurantId);
  const queueNumber = nextQueueNumber(restaurant, state.orders);
  const readyAt = now + restaurant.waitMinutes[1] * 60_000;
  const orderable = CONFIG.acceptingOrders && restaurant.isOpen && priced.lines.every((line) => !line.menuItem.soldOut && missingRequiredGroups(line.menuItem, line.selections).length === 0);
  const couponBlocked = Boolean(priced.couponIssue) || Boolean((state.cart.couponId || state.cart.couponCode) && (couponsLoading || couponsError));
  const canPay = orderable && !couponBlocked && !pending;
  const payLabel = `ยืนยันออเดอร์ ${formatBaht(priced.total)}`;

  function handleSubmit(event) {
    event.preventDefault();
    // Re-evaluate the clock on the click too, so a coupon expiring while this page is open cannot raise the price silently.
    const current = priceCart(state.cart, state.coupons);
    if (current.couponIssue || current.total !== priced.total) { setSubmitError(current.couponIssue || "ยอดชำระเปลี่ยนแล้ว กรุณาตรวจสอบอีกครั้ง"); return; }
    if (canPay && !current.couponIssue && current.total === priced.total && methods.some((option) => option.id === method)) navigate("/customer/checkout/payment", { state: { method, requestKey: checkoutAttempt(state.cart, method, current.total, state.user?.id) } });
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
            <button type="submit" disabled={!canPay} className={cx(buttonClasses({ variant: "cocoa", fullWidth: true }), "mt-5 max-lg:hidden")}>
              {payLabel}
            </button>
          </section>

          <CouponSelector priced={priced} />
          {pending && <div role="alert" className="space-y-3 rounded-3xl bg-alert/10 p-4 text-sm text-ink lg:col-start-1">
            <p>มีคำขอชำระเงินที่ยังไม่ทราบผล คำสั่งซื้อเดิมอาจสำเร็จแล้ว กรุณาตรวจสอบออเดอร์ก่อนเริ่มใหม่ เพื่อหลีกเลี่ยงออเดอร์ซ้ำ</p>
            <div className="flex flex-wrap gap-2"><Link to="/customer/orders" className={buttonClasses({ variant: "cocoa-outline", size: "sm" })}>ดูคำสั่งซื้อของฉัน</Link>{recovery && <Link to="/customer/checkout/payment" state={{ method }} className={buttonClasses({ variant: "cocoa", size: "sm" })}>ตรวจสอบคำขอเดิม · {formatBaht(recovery.total)}</Link>}</div>
            <p className="text-xs text-ink-soft">การเริ่มคำสั่งซื้อใหม่ไม่ยกเลิกคำขอเดิม และอาจทำให้มี 2 ออเดอร์</p>
            <button type="button" onClick={() => { finishCheckout(pending.key); setClearedReceipt(pending.key); }} className="rounded-full px-2 py-2 font-semibold text-cocoa underline">ตรวจสอบแล้ว ต้องการเริ่มคำสั่งซื้อใหม่</button>
          </div>}
          {couponBlocked && <p role="alert" className="text-sm text-danger lg:col-start-1">ยังยืนยันออเดอร์ไม่ได้จนกว่าจะตรวจสอบคูปองสำเร็จ กรุณาเลือกคูปองที่ใช้ได้ หรือเลือก “ไม่ใช้คูปอง”</p>}
          {submitError && couponBlocked && <p role="alert" className="text-sm text-danger lg:col-start-1">{submitError}</p>}

          <fieldset className="space-y-3 lg:col-start-1">
            <legend className="mb-3 font-bold text-ink">วิธีชำระเงิน</legend>
            {capabilities.paymentMode === "sandbox" && <p className="rounded-2xl bg-mint p-3 text-sm text-ink">โหมด Demo: PromptPay และ Wallet ใช้ทดลองเท่านั้น ไม่มีการตัดเงินจริง คุณเพิ่มยอด Wallet ได้เองที่หน้า Wallet</p>}
            {methods.map((option) => (
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
          {method === "wallet" && <Link to="/customer/wallet" className={textLinkClass}>ตรวจสอบยอดและรายการ Wallet</Link>}

          <p className="flex gap-3 rounded-3xl bg-mint/60 px-5 py-4 text-xs text-ink lg:col-start-1">
            <LockIcon className="size-4 shrink-0" />
            {method === "wallet" ? "ตัดยอดจาก Wallet เมื่อยืนยันออเดอร์ และคืนอัตโนมัติเมื่อยกเลิกตามเงื่อนไข" : "โหมดทดสอบ: จำลองการชำระเงิน ไม่มีการตัดเงินจริง"}
          </p>
          {!orderable && <p role="alert" className="text-danger">{!CONFIG.acceptingOrders ? "ระบบหยุดรับออเดอร์ชั่วคราว" : "ร้านปิดหรือมีเมนูที่ไม่เปิดขาย กรุณากลับไปแก้ไขตะกร้า"}</p>}
        </div>
      </main>

      <div className="sticky bottom-0 z-10 border-t border-haze bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:hidden">
        <button type="submit" disabled={!canPay} className={buttonClasses({ variant: "cocoa", fullWidth: true })}>
          {payLabel}
        </button>
      </div>
    </form>
  );
}

export default Checkout;
