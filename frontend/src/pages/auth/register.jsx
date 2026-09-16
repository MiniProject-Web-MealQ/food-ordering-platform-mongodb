import { useSearchParams } from "react-router";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { RegisterForm } from "@/features/auth/components/register-form";
import { usePageTitle } from "@/lib/use-page-title";

export default function RegisterPage() {
  usePageTitle("สมัครสมาชิก");
  const [searchParams] = useSearchParams();

  return (
    <div className="space-y-6">
      <AuthHeader
        title="สมัครสมาชิก"
        description="ใช้เวลาไม่ถึงหนึ่งนาที"
        back={{ href: "/", label: "กลับ" }}
      />
      <RegisterForm
        defaultRole={searchParams.get("role") === "merchant" ? "MERCHANT" : "CUSTOMER"}
      />
    </div>
  );
}
