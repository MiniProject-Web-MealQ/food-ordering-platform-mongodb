import { useState } from "react";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { requestPasswordReset } from "../api";
import { isValidEmail } from "../validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState();
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [devToken, setDevToken] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    if (!isValidEmail(email)) {
      setEmailError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    setEmailError(undefined);
    setError(null);
    setPending(true);
    const result = await requestPasswordReset(email);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDevToken(import.meta.env.DEV ? result.data.devResetToken : null);
    setSent(true);
  }

  if (sent) {
    // Deliberately identical whether or not the account exists, to avoid leaking registered emails.
    return (
      <div className="space-y-4">
        <Alert tone="success" title={devToken ? "สร้างลิงก์ตั้งรหัสผ่านใหม่แล้ว" : "ส่งคำขอตั้งรหัสผ่านใหม่แล้ว"}>
          {devToken ? "โหมดพัฒนา: ใช้ลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์หมดอายุใน 15 นาที" : "หากมีบัญชีนี้และระบบส่งอีเมลพร้อมใช้งาน ลิงก์จะถูกส่งไปยังอีเมลของคุณ"}
        </Alert>
        {devToken && <Link className="block text-center font-semibold text-brand-ink underline" to={`/reset-password?token=${devToken}`}>ตั้งรหัสผ่านใหม่</Link>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error" title={error.message} />}
      <TextField
        id="forgot-email"
        name="email"
        type="email"
        label="อีเมล"
        hideLabel
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        value={email}
        error={emailError}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button type="submit" fullWidth disabled={pending} aria-busy={pending}>
        {pending ? "กำลังส่ง…" : "ส่งลิงก์รีเซ็ต"}
      </Button>
    </form>
  );
}
