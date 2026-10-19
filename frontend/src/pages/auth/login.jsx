import { Link } from "react-router";
import { LogoMark } from "@/components/brand/logo";
import { focusRing } from "@/components/ui/styles";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { LoginForm } from "@/features/auth/components/login-form";
import { usePageTitle } from "@/lib/use-page-title";

export default function LoginPage() {
  usePageTitle("เข้าสู่ระบบ");

  return (
    <div className="auth-login-page space-y-6">
      <AuthHeader
        title="ยินดีต้อนรับกลับ"
        description="เลือกประเภทบัญชีเพื่อสั่งอาหารหรือจัดการร้านค้าของคุณ"
        leading={
          <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
            <Link
              to="/"
              aria-label="MealQ หน้าแรก"
              className={`inline-flex items-center gap-3 rounded-full ${focusRing}`}
            >
              <LogoMark className="size-12 text-xl" />
              <span className="text-xl font-bold text-ink">MealQ</span>
            </Link>
            <span aria-hidden="true" className="auth-mobile-flavours pointer-events-none flex shrink-0 items-center -space-x-3">
              <img src="/catalogue/20261019-v2/sip-garden/iced-latte.webp?v=20261019-v2-r2" alt="" width="48" height="48" loading="lazy" decoding="async" className="size-12 rounded-full object-cover ring-4 ring-white" />
              <img src="/catalogue/20261019-v2/seoul-table/kimbap.webp?v=20261019-v2-r2" alt="" width="48" height="48" loading="lazy" decoding="async" className="size-12 rounded-full object-cover ring-4 ring-white" />
            </span>
          </div>
        }
      />
      <LoginForm />
    </div>
  );
}
