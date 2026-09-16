import { useSearchParams } from "react-router";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { parseExpiresParam } from "@/features/auth/reset-link";
import { usePageTitle } from "@/lib/use-page-title";

export default function ResetPasswordPage() {
  usePageTitle("ตั้งรหัสผ่านใหม่");
  const [searchParams] = useSearchParams();

  return (
    <>
      {/* Keep reset tokens out of referrers and search indexes. React hoists these into <head>. */}
      <meta name="referrer" content="no-referrer" />
      <meta name="robots" content="noindex, nofollow" />
      <ResetPasswordForm
        token={searchParams.get("token") || null}
        expiresAt={parseExpiresParam(searchParams.get("expires"))}
      />
    </>
  );
}
