import { useState } from "react";
import { Link } from "react-router";
import { AlertTriangleIcon, TicketIcon, XIcon } from "@/components/icons";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { getRestaurant, priceCart } from "@/features/customer/catalog";
import { PageHeader } from "@/features/customer/components/page-header";
import { QtyStepper } from "@/features/customer/components/qty-stepper";
import { formatBaht } from "@/features/customer/format";
import { actions, useCustomer } from "@/features/customer/store";
import { containerClass, stickySidebarClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function SoldOutNotice({ names, restaurantId, onDismiss }) {
  return (
    <div role="alert" className="rounded-3xl border-2 border-amber/60 bg-amber/10 p-4">
      <div className="flex gap-3">
        <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber" />
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-ink">
              {names.map((n) => `“${n}”`).join(", ")} หมดระหว่างที่คุณเลือก
            </p>
            <p className="text-sm text-muted">เราเอาออกจากตะกร้าและยังไม่เก็บเงินรายการนี้</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {restaurantId && (
              <Link
                to={`/customer/restaurants/${restaurantId}`}
                onClick={onDismiss}
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                หาเมนูใกล้เคียง
              </Link>
            )}
            <button type="button" onClick={onDismiss} className={buttonClasses({ variant: "outline", size: "sm" })}>
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CouponField({ coupon, onApply, onRemove }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  if (coupon) {
    return (
      <div className="flex items-center gap-3 rounded-full border-2 border-haze px-5 py-3">
        <TicketIcon className="size-5 shrink-0 text-alert" />
        <p className="flex-1 font-medium text-ink">
          {coupon.code} — {coupon.label}
        </p>
        <span className="text-sm font-semibold text-brand-ink">ใช้แล้ว</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`ยกเลิกคูปอง ${coupon.code}`}
          className={`-mr-2 grid size-8 place-items-center rounded-full text-muted hover:bg-haze ${focusRing}`}
        >
          <XIcon className="size-4" />
        </button>
      </div>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!onApply(code)) setError("โค้ดนี้ใช้ไม่ได้");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1" noValidate>
      <div className="flex items-center gap-2 rounded-full border-2 border-haze py-1.5 pr-1.5 pl-5 focus-within:border-brand">
        <TicketIcon className="size-5 shrink-0 text-muted" />
        <label htmlFor="coupon-code" className="sr-only">
          โค้ดส่วนลด
        </label>
        <input
          id="coupon-code"
          placeholder="กรอกโค้ดส่วนลด"
          autoCapitalize="characters"
          value={code}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "coupon-error" : undefined}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          className="min-w-0 flex-1 bg-transparent text-ink uppercase placeholder:text-muted/70 placeholder:normal-case focus:outline-none"
        />
        <button type="submit" disabled={!code.trim()} className={buttonClasses({ variant: "soft", size: "sm" })}>
          ใช้โค้ด
        </button>
      </div>
      {error && (
        <p id="coupon-error" className="px-5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function Cart() {
  usePageTitle("ตะกร้า");
  const { state, dispatch } = useCustomer();
  const { cart } = state;
  const priced = priceCart(cart);
  const restaurant = cart.restaurantId ? getRestaurant(cart.restaurantId) : null;
  const empty = priced.lines.length === 0;

  function applyCoupon(code) {
    const action = actions.applyCoupon(code);
    if (action) dispatch(action);
    return Boolean(action);
  }

  const checkoutLink = restaurant && (
    <Link
      to="/customer/checkout"
      aria-disabled={!restaurant.isOpen || undefined}
      onClick={(e) => !restaurant.isOpen && e.preventDefault()}
      className={buttonClasses({ variant: "primary", fullWidth: true })}
    >
      {restaurant.isOpen ? `ดำเนินการชำระเงิน · ${formatBaht(priced.total)}` : "ร้านปิดอยู่ ยังสั่งไม่ได้"}
    </Link>
  );

  return (
    <>
      <main className={cx(containerClass, "flex-1 pb-8 lg:pb-16")}>
        <PageHeader title="ตะกร้า" fallback={restaurant ? `/customer/restaurants/${restaurant.id}` : "/customer"} />

        {empty ? (
          <div className="space-y-4">
            {cart.removedItems.length > 0 && (
              <SoldOutNotice
                names={cart.removedItems}
                restaurantId={cart.restaurantId}
                onDismiss={() => dispatch({ type: "cart/dismissRemoved" })}
              />
            )}
            <div className="mx-auto max-w-xl space-y-4 rounded-4xl bg-cream px-6 py-10 text-center lg:py-16">
              <p className="text-lg font-bold text-ink lg:text-2xl">ตะกร้ายังว่างอยู่</p>
              <p className="text-muted">เลือกร้านแล้วกด + ที่เมนูที่อยากกิน</p>
              <Link to="/customer/explore" className={buttonClasses({ variant: "primary", size: "md" })}>
                ไปค้นหาร้าน
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8 lg:space-y-0">
            <div className="space-y-4">
              {cart.removedItems.length > 0 && (
                <SoldOutNotice
                  names={cart.removedItems}
                  restaurantId={cart.restaurantId}
                  onDismiss={() => dispatch({ type: "cart/dismissRemoved" })}
                />
              )}

              <Link
                to={`/customer/restaurants/${restaurant.id}`}
                className={`flex items-center gap-3 rounded-3xl bg-haze px-4 py-3 hover:bg-mint/60 lg:px-6 lg:py-4 ${focusRing}`}
              >
                <span aria-hidden="true" className="size-10 shrink-0 rounded-full bg-cream lg:size-12" />
                <span>
                  <span className="block font-bold text-ink lg:text-lg">{restaurant.name}</span>
                  <span className="block text-sm text-muted">
                    คิว {restaurant.queueLength} · รับเองที่{restaurant.location.split(" ชั้น")[0]}
                  </span>
                </span>
              </Link>

              <ul className="divide-y divide-haze lg:rounded-4xl lg:px-6 lg:ring-1 lg:ring-haze">
                {priced.lines.map((line) => (
                  <li key={line.key} className="flex gap-3 py-4 lg:gap-5 lg:py-5">
                    <ImagePlaceholder
                      compact
                      label={line.menuItem.shortLabel}
                      className="size-16 shrink-0 rounded-2xl lg:size-20"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex justify-between gap-3">
                        <p className="font-semibold text-ink lg:text-lg">{line.menuItem.name}</p>
                        <p className="font-semibold text-ink lg:text-lg">{formatBaht(line.lineTotal)}</p>
                      </div>
                      {line.optionLabels.length > 0 && (
                        <p className="text-sm text-muted">{line.optionLabels.join(" · ")}</p>
                      )}
                      {line.note && <p className="text-sm text-muted">“{line.note}”</p>}
                      <div className="pt-1">
                        <QtyStepper
                          size="sm"
                          label={`จำนวน ${line.menuItem.name}`}
                          value={line.qty}
                          onChange={(qty) => dispatch({ type: "cart/setQty", key: line.key, qty })}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className={cx("space-y-4", stickySidebarClass)}>
              <CouponField
                coupon={priced.coupon}
                onApply={applyCoupon}
                onRemove={() => dispatch({ type: "cart/removeCoupon" })}
              />

              <dl className="space-y-2 rounded-3xl bg-cream p-5 text-sm lg:p-6">
                <div className="flex justify-between text-ink">
                  <dt>ยอดรวมอาหาร</dt>
                  <dd>{formatBaht(priced.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-ink">
                  <dt>ค่าบริการ</dt>
                  <dd>{formatBaht(priced.serviceFee)}</dd>
                </div>
                {priced.coupon && (
                  <div className="flex justify-between text-brand-ink">
                    <dt>ส่วนลด {priced.coupon.code}</dt>
                    <dd>−{formatBaht(priced.discount)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-haze pt-3">
                  <dt className="font-bold text-ink">ยอดชำระ</dt>
                  <dd className="text-2xl font-bold text-ink">{formatBaht(priced.total)}</dd>
                </div>
              </dl>

              <div className="hidden lg:block">{checkoutLink}</div>
            </aside>
          </div>
        )}
      </main>

      {!empty && (
        <div className="sticky bottom-0 z-10 border-t border-haze bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 lg:hidden">
          {checkoutLink}
        </div>
      )}
    </>
  );
}

export default Cart;
