import { EmailChangeForm } from "@/features/customer/components/email-change-form";
import { PushSettings } from "@/features/customer/components/push-settings";
import { EmailOrderSettings } from "@/features/customer/components/email-order-settings";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRightIcon } from "@/components/icons";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { currentStatus } from "@/features/customer/catalog";
import { saveProfile } from "@/features/customer/api";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { PAYMENT_METHODS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";
import { containerClass } from "@/features/customer/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";
import { postJson } from "@/lib/api-client";
import { logoutWithPushCleanup } from "@/features/customer/push-subscription";

// Roughly how long a walk-in wait would have been per order; drives the "เวลาที่ประหยัด" stat.
const MINUTES_SAVED_PER_ORDER = 10;

const rowClass = `flex min-h-15 items-center justify-between gap-4 px-5 py-3 text-ink hover:bg-haze/60 ${focusRing} focus-visible:-outline-offset-2`;

function Stat({ value, label, highlight }) {
  return (
    <div className={cx("rounded-3xl px-3 py-4 text-center", highlight ? "bg-mint" : "bg-cream")}>
      <dd className="font-display text-2xl font-black text-ink">{value}</dd>
      <dt className="text-xs text-ink-soft">{label}</dt>
    </div>
  );
}

function Profile() {
  usePageTitle("โปรไฟล์");
  const navigate = useNavigate();
  const { state, dispatch, capabilities } = useCustomer();
  const [name, setName] = useState(state.user?.name || "");
  const [phone, setPhone] = useState(state.user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [choosingPayment, setChoosingPayment] = useState(false);

  const completed = state.orders.filter((o) => currentStatus(o) === "PICKED_UP").length;
  const hoursSaved = ((completed * MINUTES_SAVED_PER_ORDER) / 60).toFixed(1);
  const unread = state.notifications.filter((n) => !n.read).length;
  const payment = PAYMENT_METHODS.find((m) => m.id === state.settings.paymentMethod) || PAYMENT_METHODS[0];
  const setSetting = (key, value) => dispatch({ type: "settings/set", key, value });

  async function handleSave(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await saveProfile({ name: name.trim(), phone: phone.trim() || null });
    if (result.ok) { dispatch({ type: "profile/set", user: result.data.user }); setMessage("บันทึกข้อมูลแล้ว"); }
    else setMessage(result.error?.message || "บันทึกข้อมูลไม่สำเร็จ");
    setSaving(false);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setMessage(null);
    try {
      await logoutWithPushCleanup({ postJson });
      navigate("/login", { replace: true });
    } catch (error) {
      setMessage(error.message || "ปิดแจ้งเตือนอุปกรณ์ก่อนออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoggingOut(false);
    }
  }

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
          className="grid size-20 shrink-0 place-items-center rounded-full border-2 border-dashed border-leaf bg-cream text-center text-xs text-ink-soft"
        >
          รูป
          <br />
          โปรไฟล์
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ink lg:text-3xl">{state.user?.name}</h1>
          <p className="truncate text-ink-soft">{state.user?.email}</p>
          <p className="text-ink-soft">{state.user?.phone || "ยังไม่มีเบอร์โทร"}</p>
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-3 lg:col-start-1">
        <Stat value={state.orders.length} label="ออเดอร์" />
        <Stat value={state.favorites.restaurants.length} label="ร้านโปรด" />
        <Stat value={`${hoursSaved} ชม.`} label="เวลาที่ประหยัด" highlight />
      </dl>

      <div className="space-y-4 lg:col-start-2 lg:row-span-4 lg:row-start-1">
        <form onSubmit={handleSave} className="space-y-3 rounded-3xl bg-cream p-5">
          <h2 className="font-bold text-ink">แก้ไขข้อมูลส่วนตัว</h2>
          <label className="block text-sm text-ink">ชื่อ
            <input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-2xl border border-haze bg-white px-4 py-3" />
          </label>
          <label className="block text-sm text-ink">เบอร์โทร
            <input type="tel" pattern="[0-9+() -]{8,20}" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-2xl border border-haze bg-white px-4 py-3" />
          </label>
          <button type="submit" disabled={saving} className={buttonClasses({ variant: "cocoa", size: "md" })}>{saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</button>
          {message && <p role="status" className="text-sm text-ink">{message}</p>}
        </form>
        <EmailChangeForm />
        <PushSettings userId={state.user?.id} />
        <EmailOrderSettings userId={state.user?.id} email={state.user?.email} />
        <nav aria-label="บัญชี" className="overflow-hidden rounded-3xl bg-cream">
          <ul className="divide-y divide-haze">
            <li>
              <Link to="/customer/wallet" className={rowClass}>
                <span className="font-semibold">MealQ Wallet</span>
                <ChevronRightIcon className="size-5 text-ink-soft" />
              </Link>
            </li>
            <li>
              <Link to="/customer/coupons" className={rowClass}>
                <span className="font-semibold">คูปองของฉัน</span>
                <ChevronRightIcon className="size-5 text-ink-soft" />
              </Link>
            </li>
            <li>
              <Link to="/customer/orders" className={rowClass}>
                <span className="font-semibold">คำสั่งซื้อของฉัน</span>
                <ChevronRightIcon className="size-5 text-ink-soft" />
              </Link>
            </li>
            <li>
              <Link to="/customer/favorites" className={rowClass}>
                <span className="font-semibold">ร้านโปรด</span>
                <ChevronRightIcon className="size-5 text-ink-soft" />
              </Link>
            </li>
            <li>
              <Link to="/customer/notifications" className={rowClass}>
                <span className="font-semibold">การแจ้งเตือน</span>
                {unread > 0 ? (
                  <span className="grid size-6 place-items-center rounded-full bg-cocoa text-xs font-bold text-white">
                    {unread}
                    <span className="sr-only"> รายการใหม่</span>
                  </span>
                ) : (
                  <ChevronRightIcon className="size-5 text-ink-soft" />
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
                <span className="flex items-center gap-1 text-ink-soft">
                  {payment.label.replace(" QR", "")}
                  <ChevronRightIcon className={cx("size-5 transition-transform", choosingPayment && "rotate-90")} />
                </span>
              </button>
              {choosingPayment && (
                <fieldset id="payment-choices" className="space-y-2 px-5 pb-4">
                  <legend className="sr-only">วิธีชำระเงินที่ใช้ประจำ</legend>
                  {PAYMENT_METHODS.filter((method) => capabilities.paymentMethods.includes(method.id)).map((method) => (
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
              label="แจ้งเตือนในแอปเมื่ออาหารพร้อม"
              checked={state.settings.notifyReady}
              onChange={(value) => setSetting("notifyReady", value)}
            />
          </div>
          <div className="px-5 py-4">
            <ToggleSwitch
              id="setting-promotions"
              label="โปรโมชันจากร้านในแอป"
              checked={state.settings.promotions}
              onChange={(value) => setSetting("promotions", value)}
            />
          </div>
          <div className="flex items-center justify-between px-5 py-4 text-ink">
            <span className="font-semibold">ภาษา</span>
            <span className="text-ink-soft">ไทย</span>
          </div>
          <Link to="/#faq" className={cx(rowClass, "rounded-b-3xl")}>
            <span className="font-semibold">ช่วยเหลือ</span>
            <ChevronRightIcon className="size-5 text-ink-soft" />
          </Link>
        </section>

      </div>

      <section aria-labelledby="devices-title" className="space-y-2 rounded-3xl bg-cream px-5 py-4 lg:col-start-1">
        <h2 id="devices-title" className="font-bold text-ink">การเข้าสู่ระบบ</h2>
        <p className="text-sm text-ink-soft">บัญชีนี้กำลังเข้าสู่ระบบบนเบราว์เซอร์ปัจจุบัน</p>
      </section>

      <button
        type="button"
        disabled={loggingOut}
        onClick={handleLogout}
        className={cx(buttonClasses({ fullWidth: true, variant: "danger-outline" }), "lg:col-start-1")}
      >
        {loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
      </button>
    </div>
  );
}

export default Profile;
