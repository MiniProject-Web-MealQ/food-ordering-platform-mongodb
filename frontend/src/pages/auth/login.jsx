import { Link } from "react-router";
import { LogoMark } from "@/components/brand/logo";
import { focusRing } from "@/components/ui/styles";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { LoginForm } from "@/features/auth/components/login-form";
import { usePageTitle } from "@/lib/use-page-title";

export default function LoginPage() {
  usePageTitle("เข้าสู่ระบบ");

  return (
    <div className="space-y-6">
      <AuthHeader
        title="ยินดีต้อนรับกลับ"
        description="เข้าสู่ระบบเพื่อสั่งอาหารและดูคิวของคุณ"
        leading={
          <Link
            to="/"
            aria-label="MealQ หน้าแรก"
            className={`mb-4 inline-block rounded-full lg:hidden ${focusRing}`}
          >
            <LogoMark className="size-14 text-2xl" />
          </Link>
        }
      />
      <LoginForm />
    </div>
  );
}
