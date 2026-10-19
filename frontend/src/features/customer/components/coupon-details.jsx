import { Link } from "react-router";
import { buttonClasses } from "@/components/ui/styles";
import { couponEligibility, couponLabel } from "../coupons";
import { getRestaurant } from "../catalog";
import { formatBaht } from "../format";
import { useCustomer } from "../store";

const dateLabel = (value) => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date) : "ไม่ระบุ";
};

export function CouponDetails({ coupon }) {
  return <span className="block space-y-1 text-xs leading-relaxed text-ink-soft">
    <span className="block">{coupon.storeId || coupon.restaurantId ? `เฉพาะร้าน ${coupon.storeName || "ที่กำหนด"}` : "ใช้ได้ทุกร้านที่ร่วมรายการ"} · ยอดอาหารขั้นต่ำ {formatBaht(Number(coupon.minimumOrder || 0))}</span>
    {coupon.maxDiscount != null && <span className="block">ส่วนลดสูงสุด {formatBaht(Number(coupon.maxDiscount))} ต่อออเดอร์</span>}
    {coupon.startsAt && <span className="block">เริ่มใช้ {dateLabel(coupon.startsAt)}</span>}
    <span className="block">หมดอายุ {dateLabel(coupon.expiresAt)}</span>
    {coupon.remainingUses != null && <span className="block">สิทธิ์ของคุณเหลือ {coupon.remainingUses} ครั้ง</span>}
    {coupon.remainingUses == null && coupon.perUserLimit != null && <span className="block">ใช้ได้สูงสุด {coupon.perUserLimit} ครั้งต่อบัญชี</span>}
    {coupon.remainingGlobalUses != null && <span className="block">สิทธิ์รวมเหลือ {coupon.remainingGlobalUses} ครั้ง</span>}
  </span>;
}

export function CouponSelector({ priced }) {
  const { state, dispatch, couponsLoading, couponsError, refreshCoupons } = useCustomer();
  const restaurant = getRestaurant(state.cart.restaurantId);
  return <fieldset id="checkout-coupons" className="space-y-3 rounded-3xl border border-haze bg-white p-5 lg:col-start-1 lg:p-6">
    <legend className="px-1 font-bold text-ink">เลือกคูปองส่วนลด</legend>
    <p className="text-sm text-ink-soft">ใช้ได้ 1 คูปองต่อออเดอร์ เลือกจากคูปองที่เก็บไว้เท่านั้น</p>
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-haze bg-cream p-4 has-checked:border-cocoa has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
      <input type="radio" name="order-coupon" value="" checked={!state.cart.couponId && !state.cart.couponCode} onChange={() => dispatch({ type: "cart/removeCoupon" })} className="size-5 shrink-0 accent-cocoa" />
      <span className="font-semibold text-ink">ไม่ใช้คูปอง</span>
    </label>
    {couponsLoading && <p role="status" className="text-sm text-ink-soft">กำลังตรวจสอบคูปองที่เก็บไว้…</p>}
    {couponsError && <div role="alert" className="space-y-2 rounded-2xl bg-alert/10 p-3 text-sm text-danger"><p>{couponsError}</p><button type="button" onClick={refreshCoupons} className="font-semibold underline">โหลดคูปองอีกครั้ง</button></div>}
    {state.coupons.map((coupon) => {
      const availability = couponEligibility(coupon, { subtotal: priced.subtotal, restaurantIds: [state.cart.restaurantId, restaurant?.backendId].filter(Boolean) });
      const disabled = !availability.eligible || couponsLoading || Boolean(couponsError);
      return <label key={coupon.id} className="block rounded-2xl border border-haze bg-cream p-4 has-checked:border-cocoa has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
        <span className="flex items-start gap-3">
          <input type="radio" name="order-coupon" value={coupon.id} disabled={disabled} checked={state.cart.couponId === coupon.id} onChange={() => dispatch({ type: "cart/applyCoupon", id: coupon.id, code: coupon.code })} aria-describedby={`coupon-reason-${coupon.id}`} className="mt-1 size-5 shrink-0 accent-cocoa" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block font-bold text-ink">{coupon.title || couponLabel(coupon)} · {coupon.code}</span>
            <span className="block text-sm font-semibold text-brand-ink">{couponLabel(coupon)}{availability.eligible && ` · ประหยัด ${formatBaht(availability.discount)}`}</span>
            {coupon.description && <span className="block text-sm text-ink-soft">{coupon.description}</span>}
            <CouponDetails coupon={coupon} />
            <span id={`coupon-reason-${coupon.id}`} className={`block text-sm ${availability.eligible ? "text-brand-ink" : "text-danger"}`}>{availability.reason || "ใช้กับตะกร้านี้ได้"}</span>
          </span>
        </span>
      </label>;
    })}
    {!couponsLoading && !couponsError && !state.coupons.length && <p className="text-sm text-ink-soft">ยังไม่ได้เก็บคูปอง เลือกเก็บก่อนแล้วกลับมาใช้ได้</p>}
    {priced.couponIssue && <p role="alert" className="rounded-2xl bg-alert/10 p-3 text-sm text-danger">{priced.couponIssue} กรุณาเลือกคูปองอื่น หรือเลือก “ไม่ใช้คูปอง” ก่อนชำระเงิน</p>}
    <Link to="/customer/coupons" className={buttonClasses({ variant: "cocoa-outline", size: "sm" })}>ดูและเก็บคูปองเพิ่ม</Link>
  </fieldset>;
}
