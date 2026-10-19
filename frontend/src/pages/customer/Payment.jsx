import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { CheckIcon, XIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/styles";
import { checkOrderStock, createOrder, getMyCoupons } from "@/features/customer/api";
import { getSession } from "@/features/auth/api";
import { getRestaurant, nextQueueNumber, priceCart } from "@/features/customer/catalog";
import { formatBaht, formatClock } from "@/features/customer/format";
import { PAYMENT_METHODS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { usePageTitle } from "@/lib/use-page-title";
import { checkoutAttempt, finishCheckout, markCheckoutSubmitted, pendingSubmittedCheckout, submittedCheckout } from "@/features/customer/checkout-attempt";
import { submitStockCheckedOrder } from "@/features/customer/checkout-stock-flow";

const PROCESSING_MS = 800;
const SUCCESS_HOLD_MS = 1000;

function Payment() {
  usePageTitle("กำลังชำระเงิน");
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { state, dispatch, refreshCoupons } = useCustomer();
  const method = PAYMENT_METHODS.find((m) => m.id === routeState?.method);
  const [result, setResult] = useState(null);
  const [summary] = useState(() => {
    const priced = priceCart(state.cart, state.coupons);
    const recovery = submittedCheckout(state.cart, method?.id, state.user?.id);
    const restaurant = state.cart.restaurantId ? getRestaurant(state.cart.restaurantId) : null;
    return {
      priced,
      cart: state.cart,
      total: recovery?.total ?? priced.total,
      ownerId: state.user?.id,
      hasItems: recovery ? state.cart.items.length > 0 : priced.lines.length > 0,
      recovery: Boolean(recovery),
      blockedByPending: Boolean(pendingSubmittedCheckout(state.user?.id) && !recovery),
      queueNumber: restaurant ? nextQueueNumber(restaurant, state.orders) : null,
      requestKey: recovery?.key || (method?.id && state.cart.items.length ? checkoutAttempt(state.cart, method.id, priced.total, state.user?.id) : null),
    };
  });
  const submitted = useRef(summary.recovery);
  const [processingPhase, setProcessingPhase] = useState(summary.recovery ? "recovering-order" : "checking-stock");
  const currentOwner = useRef(state.user?.id);
  useEffect(() => { currentOwner.current = state.user?.id; }, [state.user?.id]);

  useEffect(() => {
    if (!method || !summary.hasItems || result !== null) return;
    let cancelled = false;
    function stopForAccountChange() {
      if (cancelled) return true;
      if (currentOwner.current === summary.ownerId) return false;
      setResult({ ok: false, uncertain: submitted.current, at: Date.now(), error: { code: "AUTH_REQUIRED", message: "บัญชีเปลี่ยนแล้ว กรุณาเข้าสู่ระบบและตรวจสอบตะกร้าใหม่" } });
      return true;
    }
    const timer = setTimeout(async () => {
      try {
        if (summary.blockedByPending || !summary.requestKey) {
          setResult({ ok: false, at: Date.now(), error: { code: "COUPON_REVIEW_REQUIRED", message: "ยังมีคำขอชำระเงินเดิมที่ไม่ทราบผล กรุณากลับไปตรวจสอบก่อนเริ่มคำสั่งซื้อใหม่" } });
          return;
        }
        const session = await getSession();
        if (stopForAccountChange()) return;
        if (!session.ok) {
          setResult({ ok: false, uncertain: submitted.current, preflight: !submitted.current, at: Date.now(), error: session.error || { code: "NETWORK_ERROR", message: "ยังตรวจสอบบัญชีไม่ได้ กรุณาลองใหม่ก่อนชำระเงิน" } });
          return;
        }
        if (!summary.ownerId || session.data?.user?.id !== summary.ownerId) {
          setResult({ ok: false, uncertain: submitted.current, at: Date.now(), error: { code: "AUTH_REQUIRED", message: "บัญชีที่เข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบและตรวจสอบตะกร้าใหม่" } });
          return;
        }
        let coupons = [];
        if (!submitted.current && (summary.cart.couponId || summary.cart.couponCode)) {
          const wallet = await getMyCoupons();
          if (stopForAccountChange()) return;
          if (!wallet.ok) {
            setResult({ ok: false, at: Date.now(), error: { code: "COUPON_REVIEW_REQUIRED", message: wallet.error?.message || "ยังตรวจสอบคูปองไม่ได้ กรุณากลับไปชำระเงินแล้วลองใหม่" } });
            return;
          }
          coupons = wallet.data?.coupons || [];
        }
        const current = priceCart(summary.cart, coupons);
        if (!submitted.current && (current.couponIssue || current.total !== summary.total)) {
          setResult({ ok: false, at: Date.now(), error: { code: "COUPON_REVIEW_REQUIRED", message: current.couponIssue || "ยอดชำระเปลี่ยนแล้ว กรุณากลับไปตรวจสอบราคาและคูปองก่อนยืนยันใหม่" } });
          return;
        }
        if (stopForAccountChange()) return;
        const response = await submitStockCheckedOrder({
          alreadySubmitted: submitted.current,
          ownerId: summary.ownerId,
          isActive: () => !cancelled,
          isOwner: () => currentOwner.current === summary.ownerId,
          checkStock: () => checkOrderStock({ cart: summary.cart, paymentMethod: method.id }),
          verifySession: getSession,
          onPhase: setProcessingPhase,
          markSubmitted: () => {
            submitted.current = true;
            markCheckoutSubmitted(summary.cart, method.id, summary.total, summary.requestKey, summary.ownerId);
          },
          createOrder: () => createOrder({ cart: summary.cart, priced: { ...current, total: summary.total }, paymentMethod: method.id, requestKey: summary.requestKey }),
        });
        if (response.cancelled || stopForAccountChange()) return;
        if (!response.ok) {
          if (!response.preflight && response.status >= 400 && response.status < 500 && response.error?.code !== "CHECKOUT_IN_PROGRESS") {
            submitted.current = false;
            finishCheckout(summary.requestKey);
          }
          setResult({ ok: false, uncertain: submitted.current, preflight: response.preflight, at: Date.now(), error: response.error });
          return;
        }
        const order = response.data?.order;
        if (!order) throw new Error("Missing order response");
        finishCheckout(summary.requestKey);
        const at = Date.now();
        dispatch({ type: "order/place", order });
        setResult({ ok: true, orderId: order.orderNumber, total: order.totalPrice, paymentMode: order.paymentMode, at });
        // Refreshing coupon metadata cannot turn a confirmed order into an uncertain one.
        void Promise.resolve().then(() => refreshCoupons()).catch(() => {});
      } catch {
        if (stopForAccountChange()) return;
        setResult({ ok: false, uncertain: submitted.current, preflight: !submitted.current, at: Date.now(), error: { code: "NETWORK_ERROR", message: submitted.current ? "ยังเชื่อมต่อเพื่อยืนยันผลคำสั่งซื้อไม่ได้ กรุณาตรวจสอบคำขอเดิมอีกครั้ง" : "ยังตรวจสอบรายการอาหารไม่ได้ กรุณาลองใหม่ก่อนชำระเงิน" } });
      }
    }, PROCESSING_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [method, summary, result, dispatch, refreshCoupons]);

  useEffect(() => {
    if (!result?.ok) return;
    const timer = setTimeout(
      () => navigate(`/customer/orders/${result.orderId}/confirmed`, { replace: true }),
      SUCCESS_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [result, navigate]);

  if (!method || !summary.hasItems) return <Navigate to="/customer/cart" replace />;
  const stockIssue = ["OUT_OF_STOCK", "RECIPE_NOT_CONFIGURED"].includes(result?.error?.code);
  const shortages = Array.isArray(result?.error?.details?.shortages) ? result.error.details.shortages.filter((item) => typeof item?.name === "string") : [];

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-20">
      <div className="w-full max-w-md">
        {result === null && (
          <div role="status" className="w-full rounded-4xl bg-forest px-6 py-14 text-center text-white">
            <span
              aria-hidden="true"
              className="mx-auto block size-16 animate-spin rounded-full border-4 border-white/15 border-t-brand motion-reduce:animate-none"
            />
            <p className="mt-6 text-xl font-bold">{processingPhase === "checking-stock" ? "กำลังตรวจสต็อกอาหาร…" : processingPhase === "recovering-order" ? "กำลังตรวจสอบคำขอเดิม…" : "กำลังส่งออเดอร์ไปที่ร้าน…"}</p>
            <p className="mt-2 text-sm text-white/75">{processingPhase === "checking-stock" ? "ตรวจสอบวัตถุดิบและจำนวนที่เลือกก่อนยืนยันออเดอร์" : processingPhase === "recovering-order" ? "ใช้รหัสคำขอเดิมเพื่อไม่ตัดยอดซ้ำ" : "กำลังยืนยันรายการอาหารและคิวของคุณ"}</p>
          </div>
        )}

        {result?.ok && (
          <div role="status" className="w-full rounded-4xl bg-white px-6 py-14 text-center shadow-card">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint text-brand-ink">
              <CheckIcon className="size-8" strokeWidth={3} />
            </span>
            <p className="mt-6 text-2xl font-bold text-ink">ส่งออเดอร์สำเร็จ</p>
            {result.paymentMode === "sandbox" && <p className="mt-2 text-sm text-ink-soft">โหมดทดสอบ: ไม่มีการตัดเงินจริง</p>}
            <p className="mt-2 text-sm text-ink-soft">
              {formatBaht(result.total)} · {method.label} · {formatClock(result.at)}
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div role="alert" className="w-full rounded-4xl bg-white px-6 py-12 text-center shadow-card">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-alert/15 text-danger">
              <XIcon className="size-8" strokeWidth={3} />
            </span>
            <p className="mt-6 text-2xl font-bold text-ink">{result.uncertain ? "ยังไม่ทราบผลคำสั่งซื้อ" : result.error?.code === "RECIPE_NOT_CONFIGURED" ? "เมนูนี้ยังไม่พร้อมรับออเดอร์" : stockIssue ? "อาหารไม่พอสำหรับจำนวนที่เลือก" : result.preflight ? "ยังตรวจสอบก่อนสั่งไม่สำเร็จ" : "ส่งออเดอร์ไม่สำเร็จ"}</p>
            {result.uncertain && <p className="mt-2 text-sm text-ink-soft">คำสั่งซื้ออาจสำเร็จแล้ว ลองตรวจสอบคำขอเดิมอีกครั้ง ระบบใช้รหัสคำขอเดิมเพื่อไม่ตัดยอดซ้ำ</p>}
            <p className="mt-2 text-sm text-ink-soft">
              {result.error?.message || "ไม่สามารถเชื่อมต่อ Backend ได้"}
            </p>
            {shortages.length > 0 && <ul aria-label="เมนูที่ยังไม่พร้อม" className="mt-4 space-y-1 rounded-2xl bg-haze p-4 text-left text-sm text-ink">{shortages.map((item, index) => <li key={`${item.menuId || item.name}-${index}`}>• {item.name}</li>)}</ul>}
            {result.preflight && !result.uncertain && <p className="mt-3 text-sm font-semibold text-brand-ink">ยังไม่ได้ส่งออเดอร์หรือหักยอดเงิน</p>}
            {result.error?.code === "AUTH_REQUIRED" && (
              <p className="mt-2 text-xs text-ink-soft">กรุณาเข้าสู่ระบบ Customer แล้วลองสั่งอีกครั้ง</p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={result.error?.code === "COUPON_REVIEW_REQUIRED"}
                onClick={() => setResult(null)}
                className={buttonClasses({ variant: "cocoa", size: "md" })}
              >
                ลองอีกครั้ง
              </button>
              <button
                type="button"
                onClick={() => navigate(result.error?.code === "AUTH_REQUIRED" ? "/login" : stockIssue ? "/customer/cart" : "/customer/checkout", { replace: true })}
                className={buttonClasses({ variant: "cocoa-outline", size: "md" })}
              >
                {result.error?.code === "AUTH_REQUIRED" ? "เข้าสู่ระบบ" : stockIssue ? "กลับไปปรับตะกร้า" : "กลับไปชำระเงิน"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default Payment;
