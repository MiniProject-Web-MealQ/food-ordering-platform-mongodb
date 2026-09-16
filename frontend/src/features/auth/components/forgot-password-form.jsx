import { useState } from "react";
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
    setSent(true);
  }

  if (sent) {
    // Deliberately identical whether or not the account exists, to avoid leaking registered emails.
    return (
      <Alert tone="success" title="ตรวจสอบกล่องอีเมลของคุณ">
        ถ้ามีบัญชีที่ใช้ {email.trim()} เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว
      </Alert>
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
