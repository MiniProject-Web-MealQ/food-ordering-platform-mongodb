import { AuthHeader } from "@/features/auth/components/auth-header";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { usePageTitle } from "@/lib/use-page-title";

export default function ForgotPasswordPage() {
  usePageTitle("ลืมรหัสผ่าน");

  return (
    <div className="space-y-6">
      <AuthHeader
        title="ลืมรหัสผ่าน"
        description="กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสใหม่ให้"
        back={{ href: "/login", label: "เข้าสู่ระบบ" }}
      />
      <ForgotPasswordForm />
    </div>
  );
}
