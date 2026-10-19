import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordField } from "@/components/ui/password-field";
import { textLinkClass } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { register } from "../api";
import { ROLE_HOME } from "../types";
import { validateRegistration } from "../validation";
import { PasswordStrength } from "./password-strength";
import { RoleCards } from "./role-picker";
import { RegistrationOtpForm } from "./registration-otp-form";
import { loadRegistrationChallenge, saveRegistrationChallenge } from "../registration-challenge";

export function RegisterForm({ defaultRole }) {
  const navigate = useNavigate();
  const [role, setRole] = useState(defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [challenge, setChallenge] = useState(loadRegistrationChallenge);

  function updateChallenge(value) {
    saveRegistrationChallenge(value);
    setChallenge(value);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    const errors = validateRegistration({ name, email, phone, password, acceptedTerms });
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    const result = await register({ role, name, email, phone, password });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPassword("");
    updateChallenge(result.data);
  }

  if (challenge) return <RegistrationOtpForm challenge={challenge} onChallenge={updateChallenge} onBack={() => updateChallenge(null)} onVerified={(verifiedRole) => { updateChallenge(null); navigate(ROLE_HOME[verifiedRole], { replace: true }); }} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <RoleCards name="role" legend="ประเภทบัญชี" value={role} onChange={setRole} />

      {error && <Alert tone="error" title={error.message} />}

      <TextField
        id="register-name"
        name="name"
        label="ชื่อที่ใช้แสดง"
        autoComplete="nickname"
        placeholder={role === "MERCHANT" ? "ชื่อร้านหรือชื่อผู้ดูแล" : "ชื่อเล่น ชื่อจริง"}
        value={name}
        error={fieldErrors.name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        id="register-email"
        name="email"
        type="email"
        label="อีเมล"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        value={email}
        error={fieldErrors.email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        id="register-phone"
        name="phone"
        type="tel"
        label="เบอร์โทร"
        autoComplete="tel"
        inputMode="tel"
        placeholder="08x-xxx-xxxx"
        value={phone}
        error={fieldErrors.phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <div className="space-y-3">
        <PasswordField
          id="register-password"
          name="password"
          label="รหัสผ่าน"
          autoComplete="new-password"
          value={password}
          error={fieldErrors.password}
          aria-describedby="register-password-strength"
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrength id="register-password-strength" password={password} />
      </div>

      <div className="space-y-1">
        <Checkbox
          id="register-terms"
          name="acceptedTerms"
          checked={acceptedTerms}
          aria-invalid={Boolean(fieldErrors.acceptedTerms) || undefined}
          aria-describedby={fieldErrors.acceptedTerms ? "register-terms-error" : undefined}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          label={
            <>
              ยอมรับ{" "}
              <Link to="/terms" className={textLinkClass}>
                เงื่อนไขการใช้งาน
              </Link>{" "}
              และ{" "}
              <Link to="/privacy" className={textLinkClass}>
                นโยบายความเป็นส่วนตัว
              </Link>
            </>
          }
        />
        {fieldErrors.acceptedTerms && (
          <p id="register-terms-error" className="pl-8 text-sm font-medium text-danger">
            {fieldErrors.acceptedTerms}
          </p>
        )}
      </div>

      <Button type="submit" fullWidth disabled={pending} aria-busy={pending}>
        {pending ? "กำลังส่ง OTP…" : "สมัครและรับ OTP ทางอีเมล"}
      </Button>

      <p className="text-center text-sm text-ink-soft">
        มีบัญชีอยู่แล้ว?{" "}
        <Link to="/login" className={textLinkClass}>
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
