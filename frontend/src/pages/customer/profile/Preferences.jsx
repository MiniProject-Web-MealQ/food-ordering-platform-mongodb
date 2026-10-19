import { CreditCard, Languages } from "lucide-react";
import { focusRing } from "@/components/ui/styles";
import { PAYMENT_METHODS } from "@/features/customer/mock-data";
import { useCustomer } from "@/features/customer/store";

function Preferences() {
  const { state, dispatch, capabilities } = useCustomer();
  const availableIds = Array.isArray(capabilities?.paymentMethods) ? capabilities.paymentMethods : [];
  const methods = PAYMENT_METHODS.filter((method) => availableIds.includes(method.id));
  const selected = state.settings.paymentMethod;
  const selectedAvailable = methods.some((method) => method.id === selected);

  return (
    <div className="space-y-5">
      <section aria-labelledby="profile-preferences-payment-title" className="rounded-3xl border border-haze bg-white p-5 sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-cocoa"><CreditCard className="size-5" /></span>
          <div><h2 id="profile-preferences-payment-title" className="text-lg font-bold text-ink">วิธีชำระเงินที่ใช้ประจำ</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">ใช้เป็นตัวเลือกเริ่มต้นตอนชำระเงิน คุณยังเปลี่ยนวิธีได้ก่อนยืนยันแต่ละออเดอร์</p></div>
        </div>
        {methods.length ? (
          <fieldset className="space-y-3">
            <legend className="sr-only">เลือกวิธีชำระเงินที่ใช้ประจำ</legend>
            {methods.map((method) => (
              <label key={method.id} htmlFor={`profile-payment-${method.id}`} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${selected === method.id ? "border-brand bg-cream" : "border-haze bg-white hover:bg-cream/50"}`}>
                <input id={`profile-payment-${method.id}`} type="radio" name="profile-default-payment" value={method.id} checked={selected === method.id} onChange={() => dispatch({ type: "settings/set", key: "paymentMethod", value: method.id })} className={`mt-1 size-4 shrink-0 accent-brand ${focusRing}`} />
                <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{method.label}</span><span className="mt-1 block text-xs leading-relaxed text-ink-soft">{method.description}</span></span>
              </label>
            ))}
          </fieldset>
        ) : <p role="status" className="rounded-2xl bg-cream p-4 text-sm text-ink-soft">ยังไม่มีวิธีชำระเงินที่พร้อมใช้งานในขณะนี้</p>}
        {methods.length > 0 && !selectedAvailable && <p role="status" className="mt-4 rounded-2xl bg-cream p-4 text-sm leading-relaxed text-ink">วิธีชำระเงินที่เลือกไว้เดิมยังไม่พร้อมใช้งาน กรุณาเลือกจากรายการด้านบน</p>}
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">เมื่อเปลี่ยนตัวเลือก ระบบจะส่งไปบันทึกให้อัตโนมัติ หากบันทึกไม่สำเร็จจะแสดงข้อความพร้อมปุ่มลองอีกครั้งด้านบนของหน้า</p>
      </section>

      <section aria-labelledby="profile-preferences-language-title" className="rounded-3xl bg-cream p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-cocoa"><Languages className="size-5" /></span>
          <div><h2 id="profile-preferences-language-title" className="font-bold text-ink">ภาษา</h2><p className="mt-2 text-sm font-semibold text-ink">ไทย</p><p className="mt-1 text-sm leading-relaxed text-ink-soft">MealQ รองรับภาษาไทยในขณะนี้</p></div>
        </div>
      </section>
    </div>
  );
}

export default Preferences;
