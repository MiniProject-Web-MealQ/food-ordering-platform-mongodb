import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { textLinkClass } from "@/components/ui/styles";
import { resendRegistrationOtp, verifyRegistration } from "../api";

export function RegistrationOtpForm({ challenge, onChallenge, onVerified, onBack }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const resendSeconds = Math.max(0, Math.ceil((Date.parse(challenge.resendAfter) - now) / 1000));
  const expired = Date.parse(challenge.expiresAt) <= now;

  async function verify(event) {
    event.preventDefault();
    if (busy || resending) return;
    if (!/^\d{6}$/.test(code)) { setError("กรอก OTP ตัวเลข 6 หลักจากอีเมล"); return; }
    setBusy(true); setError(""); setMessage("");
    const result = await verifyRegistration(challenge.registrationId, code);
    setBusy(false);
    if (result.ok) onVerified(result.data.role);
    else setError(result.error.message);
  }

  async function resend() {
    if (busy || resending || resendSeconds) return;
    setResending(true); setError(""); setMessage("");
    const result = await resendRegistrationOtp(challenge.registrationId);
    setResending(false);
    if (result.ok) {
      onChallenge(result.data); setCode(""); setMessage("ส่ง OTP ใหม่แล้ว กรุณาตรวจกล่องจดหมายและโฟลเดอร์สแปม");
    } else {
      setError(result.error.message);
      if (Number.isFinite(Date.parse(result.error.details?.retryAfter))) onChallenge({ ...challenge, resendAfter: result.error.details.retryAfter });
    }
  }

  return <form onSubmit={verify} className="space-y-5" noValidate>
    <div className="space-y-2">
      <h2 className="text-xl font-bold text-ink">ยืนยันอีเมลด้วย OTP</h2>
      <p className="text-sm text-ink-soft">ส่งรหัส 6 หลักไปที่ <strong className="break-all text-ink">{challenge.email}</strong> แล้ว รหัสมีอายุ 10 นาที</p>
      <p className="text-sm text-ink-soft">บัญชีจะสร้างเสร็จหลังยืนยันรหัส หากไม่พบอีเมลให้ตรวจโฟลเดอร์สแปม</p>
    </div>
    {error && <Alert tone="error" title={error} />}
    {message && <p role="status" className="text-sm text-brand-ink">{message}</p>}
    {expired && <p role="status" className="text-sm text-danger">OTP หมดอายุแล้ว กรุณากดส่งรหัสใหม่</p>}
    <TextField id="register-otp" name="code" label="รหัส OTP 6 หลัก" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" disabled={busy || resending} />
    <Button type="submit" fullWidth disabled={busy || resending || expired} aria-busy={busy}>{busy ? "กำลังยืนยัน…" : "ยืนยันอีเมลและสร้างบัญชี"}</Button>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <button type="button" onClick={resend} disabled={busy || resending || resendSeconds > 0} className={`${textLinkClass} disabled:cursor-not-allowed disabled:opacity-50`}>{resending ? "กำลังส่ง…" : resendSeconds ? `ส่ง OTP อีกครั้งใน ${resendSeconds} วินาที` : "ส่ง OTP อีกครั้ง"}</button>
      <button type="button" onClick={onBack} disabled={busy || resending} className={textLinkClass}>แก้ไขอีเมล / สมัครใหม่</button>
    </div>
  </form>;
}
