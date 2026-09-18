import { Link } from "react-router";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { buttonClasses } from "@/components/ui/styles";
import { resetPassword } from "../api";
import { meetsPasswordPolicy, MIN_PASSWORD_LENGTH } from "../password";
import { formatCountdown } from "../reset-link";
import { AuthHeader } from "./auth-header";

function useRemainingTime(expiresAt) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (expiresAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return expiresAt === null ? null : Math.max(0, expiresAt - now);
}

function InvalidLink({ title }) {
  return (
    <div className="space-y-6">
      <AuthHeader title={title} description="ขอลิงก์ใหม่เพื่อตั้งรหัสผ่านอีกครั้ง" />
      <Link to="/forgot-password" className={buttonClasses({ fullWidth: true })}>
        ขอลิงก์ใหม่
      </Link>
    </div>
  );
}

export function ResetPasswordForm({ token, expiresAt }) {
  const remaining = useRemainingTime(expiresAt);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="space-y-6">
        <AuthHeader title="ตั้งรหัสผ่านใหม่แล้ว" />
        <Alert tone="success" title="ใช้รหัสผ่านใหม่เข้าสู่ระบบได้เลย" />
        <Link to="/login" className={buttonClasses({ fullWidth: true })}>
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }
  if (!token) return <InvalidLink title="ลิงก์ไม่ถูกต้อง" />;
  if (remaining === 0) return <InvalidLink title="ลิงก์หมดอายุแล้ว" />;

  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = meetsPasswordPolicy(password) && confirmation === password && !pending;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!token || !canSubmit) return;

    setPending(true);
    setError(null);
    const result = await resetPassword(token, password);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  return (
    <div className="space-y-6">
      <AuthHeader
        title="ตั้งรหัสผ่านใหม่"
        description={
          remaining === null ? (
            "ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ"
          ) : (
            <>
              ลิงก์นี้จะหมดอายุใน <time>{formatCountdown(remaining)}</time>{" "}
              นาที
            </>
          )
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error" title={error.message} />}
        <PasswordField
          id="reset-password"
          name="password"
          label="รหัสผ่านใหม่"
          autoComplete="new-password"
          hint={`อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร มีทั้งตัวอักษรและตัวเลข`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          id="reset-password-confirm"
          name="passwordConfirmation"
          label="ยืนยันรหัสผ่านใหม่"
          autoComplete="new-password"
          value={confirmation}
          error={mismatch ? "รหัสผ่านไม่ตรงกัน" : undefined}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <Button type="submit" fullWidth disabled={!canSubmit} aria-busy={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
        </Button>
      </form>
    </div>
  );
}
