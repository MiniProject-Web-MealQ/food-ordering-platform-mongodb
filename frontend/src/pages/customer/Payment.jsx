import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { CheckIcon, XIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/styles";
import { getRestaurant, nextQueueNumber, priceCart } from "@/features/customer/catalog";
import { formatBaht, formatClock } from "@/features/customer/format";
import { PAYMENT_METHODS } from "@/features/customer/mock-data";
import { actions, useCustomer } from "@/features/customer/store";
import { usePageTitle } from "@/lib/use-page-title";

const PROCESSING_MS = 2200;
const SUCCESS_HOLD_MS = 1400;

/** MOCK payment gateway: Online banking is always declined so the failure screen can be reviewed. */
function mockGatewayApproves(method) {
  return method !== "banking";
}

function Payment() {
  usePageTitle("กำลังชำระเงิน");
  const navigate = useNavigate();
  const { state: routeState } = useLocation();
  const { state, dispatch } = useCustomer();
  const method = PAYMENT_METHODS.find((m) => m.id === routeState?.method);

  const [result, setResult] = useState(null); // null while processing, then { ok, orderId?, at }
  // Snapshot what is being paid for; the cart is emptied as soon as the order is placed.
  const [summary] = useState(() => {
    const priced = priceCart(state.cart);
    const restaurant = state.cart.restaurantId ? getRestaurant(state.cart.restaurantId) : null;
    return {
      total: priced.total,
      hasItems: priced.lines.length > 0,
      queueNumber: restaurant ? nextQueueNumber(restaurant, state.orders) : null,
    };
  });

  // Setting `result` back to null (ลองอีกครั้ง) starts another attempt.
  useEffect(() => {
    if (!method || !summary.hasItems || result !== null) return;
    const timer = setTimeout(() => {
      const at = Date.now();
      if (!mockGatewayApproves(method.id)) {
        setResult({ ok: false, at });
        return;
      }
      const action = actions.placeOrder(state, method.id);
      dispatch(action);
      setResult({ ok: true, orderId: action.orderId, at });
    }, PROCESSING_MS);
    return () => clearTimeout(timer);
  }, [method, summary.hasItems, result, state, dispatch]);

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
          <p className="mt-6 text-xl font-bold">กำลังดำเนินการชำระเงิน…</p>
          <p className="mt-2 text-sm text-white/75">
            อย่าปิดหน้านี้ · เรากันคิว #{summary.queueNumber} ไว้ให้ 2 นาที
          </p>
        </div>
      )}

      {result?.ok && (
        <div role="status" className="w-full rounded-4xl bg-white px-6 py-14 text-center shadow-card">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint text-brand-ink">
            <CheckIcon className="size-8" strokeWidth={3} />
          </span>
          <p className="mt-6 text-2xl font-bold text-ink">ชำระเงินสำเร็จ</p>
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
          <p className="mt-6 text-2xl font-bold text-ink">การชำระเงินไม่สำเร็จ</p>
          <p className="mt-2 text-sm text-ink-soft">
            ธนาคารปฏิเสธรายการนี้ · ยังไม่มีการตัดเงิน และออเดอร์ยังไม่ถูกส่งให้ร้าน
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setResult(null)}
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              ลองอีกครั้ง
            </button>
            <button
              type="button"
              onClick={() => navigate("/customer/checkout", { replace: true })}
              className={buttonClasses({ variant: "outline", size: "md" })}
            >
              เปลี่ยนวิธีจ่าย
            </button>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}

export default Payment;
