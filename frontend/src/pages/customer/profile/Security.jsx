import { Link } from "react-router";
import { KeyRound, ShieldCheck } from "lucide-react";
import { buttonClasses } from "@/components/ui/styles";
import { EmailChangeForm } from "@/features/customer/components/email-change-form";

function Security() {
  return (
    <div className="space-y-5">
      <section aria-labelledby="profile-security-email-title" className="rounded-3xl border border-haze bg-white p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-cocoa"><ShieldCheck className="size-5" /></span>
          <div><h2 id="profile-security-email-title" className="text-lg font-bold text-ink">ดูแลอีเมลที่ใช้กับ MealQ</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">ใช้อีเมลที่คุณเปิดอ่านได้สำหรับยืนยันบัญชี ตั้งรหัสผ่านใหม่ และรับแจ้งเตือนออเดอร์เมื่อเปิดใช้งาน</p></div>
        </div>
      </section>

      <p className="profile-account__note">เมื่อเปลี่ยนอีเมล ระบบจะยกเลิกการเชื่อมต่อ Google เดิมและการเข้าสู่ระบบบนอุปกรณ์อื่น หากใช้ Google Login คุณสามารถขอลิงก์ตั้งรหัสผ่าน MealQ ให้กับอีเมลใหม่ได้</p>
      <EmailChangeForm />

      <section aria-labelledby="profile-security-password-title" className="rounded-3xl border border-haze bg-white p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-cocoa"><KeyRound className="size-5" /></span>
          <div className="min-w-0">
            <h2 id="profile-security-password-title" className="text-lg font-bold text-ink">ตั้งรหัสผ่าน MealQ ใหม่</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">เปิดหน้าขอลิงก์รีเซ็ต แล้วกรอกอีเมลของบัญชีนี้ ระบบจะส่งลิงก์ให้คุณตั้งรหัสผ่านใหม่ผ่านอีเมล</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">หากใช้ Google Login คุณยังเข้าสู่ระบบผ่าน Google ได้ รหัสผ่านที่ตั้งผ่าน MealQ ใช้กับบัญชี MealQ ส่วนรหัสผ่าน Google จัดการในบัญชี Google ของคุณ</p>
          </div>
        </div>
        <Link to="/forgot-password" className={`${buttonClasses({ variant: "cocoa-outline", size: "md" })} mt-5`}>ขอลิงก์ตั้งรหัสผ่านใหม่</Link>
      </section>
    </div>
  );
}

export default Security;
