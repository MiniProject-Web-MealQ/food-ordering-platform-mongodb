import { Link, useParams } from "react-router";
import { CheckIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/styles";
import { getOrderRestaurant, queuesAhead } from "@/features/customer/catalog";
import { PickupCode } from "@/features/customer/components/pickup-code";
import { formatBaht, formatOrderCode, formatRange } from "@/features/customer/format";
import { useCustomer } from "@/features/customer/store";
import { usePageTitle } from "@/lib/use-page-title";
import NotFoundPage from "@/pages/not-found";

function OrderConfirmed() {
  const { id } = useParams();
  usePageTitle("สั่งอาหารสำเร็จ");
  const { state } = useCustomer();
  const order = state.orders.find((o) => o.id === id);

  if (!order) return <NotFoundPage />;

  const restaurant = getOrderRestaurant(order);
  const ahead = queuesAhead(order);

  return (
    <main className="flex-1 bg-forest text-white">
      <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pt-12 pb-8 sm:px-6 lg:space-y-8 lg:px-8 lg:pt-16 lg:pb-20">
        <div className="text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-cocoa">
            <CheckIcon className="size-10" strokeWidth={3} />
          </span>
          <h1 className="mt-6 text-3xl font-bold lg:text-5xl">สั่งอาหารสำเร็จ!</h1>
          <p className="mt-2 text-white/80 lg:text-lg">
            ออเดอร์ {formatOrderCode(order.id)} · {restaurant.name}
            <br />
            เราจะแจ้งเตือนเมื่ออาหารพร้อม
          </p>
        </div>

        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-5 md:space-y-0">
          <section
            aria-label="คิวของคุณ"
            className="flex flex-col justify-center rounded-4xl bg-cream p-6 text-center text-ink lg:p-8"
          >
            <p className="text-xs font-semibold tracking-[0.3em] text-cocoa">คิวของคุณ</p>
            <p className="font-display text-7xl leading-tight font-black lg:text-8xl">#{order.queueNumber}</p>
            <p className="text-ink-soft">
              {order.nowServing ? `กำลังทำคิว #${order.nowServing}` : "รอร้านเริ่มทำอาหาร"} · {ahead > 0 ? `มี ${ahead} คิวก่อนคุณ` : "ไม่มีคิวก่อนคุณ"}
            </p>
            <dl className="mt-5 grid grid-cols-2 border-t border-haze pt-4">
              <div>
                <dt className="sr-only">เวลารอ</dt>
                <dd className="text-xl font-bold">{formatRange(order.etaMinutes)} นาที</dd>
                <dd className="text-xs text-ink-soft">ประมาณ</dd>
              </div>
              <div>
                <dt className="sr-only">ยอดชำระ</dt>
                <dd className="text-xl font-bold">{formatBaht(order.total)}</dd>
                <dd className="text-xs text-ink-soft">{order.paymentMode === "sandbox" ? "ยอดทดสอบ · ไม่มีการตัดเงินจริง" : "ยอดชำระ"}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="pickup-title" className="rounded-4xl bg-cream p-6 text-ink lg:p-8">
            <h2 id="pickup-title" className="mb-4 text-center text-lg font-bold">
              แสดงรหัสนี้ตอนรับอาหาร
            </h2>
            <PickupCode code={order.pickupCode} orderNumber={order.id} />
            <p className="mt-2 text-center text-sm text-ink-soft">ให้ร้านสแกน QR หรือบอกรหัส 4 หลัก</p>
          </section>
        </div>

        <div className="mx-auto max-w-md space-y-3">
          <Link to={`/customer/orders/${order.id}`} className={buttonClasses({ variant: "cocoa", fullWidth: true })}>
            ติดตามออเดอร์
          </Link>
          <Link
            to="/customer"
            className="block rounded-full py-3 text-center font-semibold text-white/80 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    </main>
  );
}

export default OrderConfirmed;
