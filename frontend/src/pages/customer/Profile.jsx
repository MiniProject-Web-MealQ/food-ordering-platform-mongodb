import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRightIcon } from "@/components/icons";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { isActiveOrder } from "@/features/customer/catalog";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { CUSTOMER_PROFILE, PAYMENT_METHODS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { containerClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

// Roughly how long a walk-in wait would have been per order; drives the "เวลาที่ประหยัด" stat.
const MINUTES_SAVED_PER_ORDER = 10;

const rowClass = `flex min-h-15 items-center justify-between gap-4 px-5 py-3 text-ink hover:bg-haze/60 ${focusRing} focus-visible:-outline-offset-2`;

function Stat({ value, label, highlight }) {
  return (
    <div className={cx("rounded-3xl px-3 py-4 text-center", highlight ? "bg-mint" : "bg-cream")}>
      <dd className="font-display text-2xl font-black text-ink">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}

function Profile() {
  usePageTitle("โปรไฟล์");
  const navigate = useNavigate();
  const { state, dispatch } = useCustomer();
  const [devices, setDevices] = useState(CUSTOMER_PROFILE.devices);
  const [choosingPayment, setChoosingPayment] = useState(false);

  const completed = state.orders.filter((o) => !isActiveOrder(o)).length;
  const hoursSaved = ((completed * MINUTES_SAVED_PER_ORDER) / 60).toFixed(1);
  const unread = state.notifications.filter((n) => !n.read).length;
  const payment = PAYMENT_METHODS.find((m) => m.id === state.settings.paymentMethod);
  const setSetting = (key, value) => dispatch({ type: "settings/set", key, value });

  return (
    // Desktop: identity, stats, devices and sign-out on the left; account links and settings on the right.
    <div
      className={cx(
        containerClass,
        "space-y-4 pt-6 pb-8 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:items-start lg:gap-x-10 lg:gap-y-5 lg:space-y-0 lg:pt-10 lg:pb-16",
      )}
    >
      <header className="flex items-center gap-4 lg:col-start-1">
        <span
          aria-hidden="true"
          className="grid size-20 shrink-0 place-items-center rounded-full border-2 border-dashed border-leaf bg-cream text-center text-xs text-muted"
        >
          รูป
          <br />
          โปรไฟล์
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink lg:text-3xl">{CUSTOMER_PROFILE.name}</h1>
          <p className="truncate text-muted">{CUSTOMER_PROFILE.email}</p>
          <p className="text-muted">{CUSTOMER_PROFILE.phone}</p>
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-3 lg:col-start-1">
        <Stat value={state.orders.length} label="ออเดอร์" />
        <Stat value={state.favorites.restaurants.length} label="ร้านโปรด" />
        <Stat value={`${hoursSaved} ชม.`} label="เวลาที่ประหยัด" highlight />
      </dl>

      <div className="space-y-4 lg:col-start-2 lg:row-span-4 lg:row-start-1">
        <nav aria-label="บัญชี" className="overflow-hidden rounded-3xl bg-cream">
          <ul className="divide-y divide-haze">
            <li>
              <Link to="/customer/orders" className={rowClass}>
                <span className="font-semibold">คำสั่งซื้อของฉัน</span>
                <ChevronRightIcon className="size-5 text-muted" />
              </Link>
            </li>
            <li>
              <Link to="/customer/favorites" className={rowClass}>
                <span className="font-semibold">ร้านโปรด</span>
                <ChevronRightIcon className="size-5 text-muted" />
              </Link>
            </li>
            <li>
              <Link to="/customer/notifications" className={rowClass}>
                <span className="font-semibold">การแจ้งเตือน</span>
                {unread > 0 ? (
                  <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                    {unread}
                    <span className="sr-only"> รายการใหม่</span>
                  </span>
                ) : (
                  <ChevronRightIcon className="size-5 text-muted" />
                )}
              </Link>
            </li>
            <li>
              <button
                type="button"
                aria-expanded={choosingPayment}
                aria-controls="payment-choices"
                onClick={() => setChoosingPayment((v) => !v)}
                className={cx(rowClass, "w-full text-left")}
              >
                <span className="font-semibold">วิธีชำระเงิน</span>
                <span className="flex items-center gap-1 text-muted">
                  {payment.label.replace(" QR", "")}
                  <ChevronRightIcon className={cx("size-5 transition-transform", choosingPayment && "rotate-90")} />
                </span>
              </button>
              {choosingPayment && (
                <fieldset id="payment-choices" className="space-y-2 px-5 pb-4">
                  <legend className="sr-only">วิธีชำระเงินที่ใช้ประจำ</legend>
                  {PAYMENT_METHODS.map((method) => (
                    <label key={method.id} className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                      <input
                        type="radio"
                        name="default-payment"
                        checked={state.settings.paymentMethod === method.id}
                        onChange={() => setSetting("paymentMethod", method.id)}
                        className="size-4 accent-brand"
                      />
                      {method.label}
                    </label>
                  ))}
                </fieldset>
              )}
            </li>
          </ul>
        </nav>

        <section aria-label="ตั้งค่า" className="divide-y divide-haze rounded-3xl bg-cream">
          <div className="px-5 py-4">
            <ToggleSwitch
              id="setting-ready"
              label="แจ้งเตือนเมื่ออาหารพร้อม"
              checked={state.settings.notifyReady}
              onChange={(value) => setSetting("notifyReady", value)}
            />
          </div>
          <div className="px-5 py-4">
            <ToggleSwitch
              id="setting-promotions"
              label="โปรโมชันจากร้าน"
              checked={state.settings.promotions}
              onChange={(value) => setSetting("promotions", value)}
            />
          </div>
          <div className="flex items-center justify-between px-5 py-4 text-ink">
            <span className="font-semibold">ภาษา</span>
            <span className="text-muted">ไทย</span>
          </div>
          <Link to="/#faq" className={cx(rowClass, "rounded-b-3xl")}>
            <span className="font-semibold">ช่วยเหลือ</span>
            <ChevronRightIcon className="size-5 text-muted" />
          </Link>
        </section>

      </div>

      <section aria-labelledby="devices-title" className="space-y-2 rounded-3xl bg-cream px-5 py-4 lg:col-start-1">
        <h2 id="devices-title" className="font-bold text-ink">
          อุปกรณ์ที่เข้าสู่ระบบ
        </h2>
        <ul className="space-y-1 text-sm text-muted">
          {devices.map((device) => (
            <li key={device.id}>
              {device.label} · {device.lastSeen}
              {!device.current && (
                <>
                  {" — "}
                  {/* MOCK: remote sign-out needs the sessions API. */}
                  <button
                    type="button"
                    onClick={() => setDevices((prev) => prev.filter((d) => d.id !== device.id))}
                    className={`rounded font-semibold text-danger underline-offset-4 hover:underline ${focusRing}`}
                  >
                    ออกจากระบบ
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        // MOCK: until POST /auth/logout exists, signing out just returns to the login screen.
        onClick={() => navigate("/login")}
        className={cx(buttonClasses({ fullWidth: true, variant: "danger-outline" }), "lg:col-start-1")}
      >
        ออกจากระบบ
      </button>
    </div>
  );
}

export default Profile;
