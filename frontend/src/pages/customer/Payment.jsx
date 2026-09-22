import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { CheckIcon, XIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/styles";
import { createOrder } from "@/features/customer/api";
import { getRestaurant, nextQueueNumber, priceCart } from "@/features/customer/catalog";
import { formatBaht, formatClock } from "@/features/customer/format";
import { PAYMENT_METHODS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { usePageTitle } from "@/lib/use-page-title";

const PROCESSING_MS = 800;
const SUCCESS_HOLD_MS = 1000;

function Payment() {
  usePageTitle("กำลังชำระเงิน");
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { state, dispatch } = useCustomer();
  const method = PAYMENT_METHODS.find((m) => m.id === routeState?.method);
  const [result, setResult] = useState(null);
  const [summary] = useState(() => {
    const priced = priceCart(state.cart);
    const restaurant = state.cart.restaurantId ? getRestaurant(state.cart.restaurantId) : null;
    return {
      priced,
      cart: state.cart,
      total: priced.total,
      hasItems: priced.lines.length > 0,
      queueNumber: restaurant ? nextQueueNumber(restaurant, state.orders) : null,
    };
  });

  useEffect(() => {
    if (!method || !summary.hasItems || result !== null) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const response = await createOrder({
        cart: summary.cart,
        priced: summary.priced,
        paymentMethod: method.id,
      });
      if (cancelled) return;

      if (!response.ok) {
        setResult({ ok: false, at: Date.now(), error: response.error });
        return;
      }

      const order = response.data.order;
      const at = Date.now();
      dispatch({
        type: "order/place",
        orderId: order.orderNumber,
        backendOrderId: order.id,
        paymentMethod: method.id,
        pickupCode: order.pickupCode,
        queueNumber: order.queueNumber,
        at,
      });
      setResult({ ok: true, orderId: order.orderNumber, at });
    }, PROCESSING_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [method, summary, result, dispatch]);

  useEffect(() => {
    if (!result?.ok) return;
    const timer = setTimeout(
      () => navigate(`/customer/orders/${result.orderId}/confirmed`, { replace: true }),
      SUCCESS_HOLD_MS,
    );
    return () => clearTimeout(timer);
  }, [result, navigate]);

  if (!method || !summary.hasItems) return <Navigate to="/customer/cart" replace />;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-20">
      <div className="w-full max-w-md">
        {result === null && (
          <div role="status" className="w-full rounded-4xl bg-forest px-6 py-14 text-center text-white">
            <span
              aria-hidden="true"
              className="mx-auto block size-16 animate-spin rounded-full border-4 border-white/15 border-t-brand motion-reduce:animate-none"
            />
            <p className="mt-6 text-xl font-bold">กำลังส่งออเดอร์ไปที่ร้าน…</p>
            <p className="mt-2 text-sm text-white/75">MealQ กำลังบันทึกออเดอร์ลง MongoDB</p>
          </div>
        )}

        {result?.ok && (
          <div role="status" className="w-full rounded-4xl bg-white px-6 py-14 text-center shadow-card">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint text-brand-ink">
              <CheckIcon className="size-8" strokeWidth={3} />
            </span>
            <p className="mt-6 text-2xl font-bold text-ink">ชำระเงินและส่งออเดอร์สำเร็จ</p>
            <p className="mt-2 text-sm text-ink-soft">
              {formatBaht(summary.total)} · {method.label} · {formatClock(result.at)}
            </p>
          </div>
        )}

        {result && !result.ok && (
          <div role="alert" className="w-full rounded-4xl bg-white px-6 py-12 text-center shadow-card">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-alert/15 text-danger">
              <XIcon className="size-8" strokeWidth={3} />
            </span>
            <p className="mt-6 text-2xl font-bold text-ink">ส่งออเดอร์ไม่สำเร็จ</p>
            <p className="mt-2 text-sm text-ink-soft">
              {result.error?.message || "ไม่สามารถเชื่อมต่อ Backend ได้"}
            </p>
            {result.error?.code === "AUTH_REQUIRED" && (
              <p className="mt-2 text-xs text-ink-soft">กรุณาเข้าสู่ระบบ Customer แล้วลองสั่งอีกครั้ง</p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResult(null)}
                className={buttonClasses({ variant: "cocoa", size: "md" })}
              >
                ลองอีกครั้ง
              </button>
              <button
                type="button"
                onClick={() => navigate(result.error?.code === "AUTH_REQUIRED" ? "/login" : "/customer/checkout", { replace: true })}
                className={buttonClasses({ variant: "cocoa-outline", size: "md" })}
              >
                {result.error?.code === "AUTH_REQUIRED" ? "เข้าสู่ระบบ" : "กลับไปชำระเงิน"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default Payment;
