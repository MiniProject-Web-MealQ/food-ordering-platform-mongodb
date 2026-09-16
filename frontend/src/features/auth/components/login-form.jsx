import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { GoogleIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordField } from "@/components/ui/password-field";
import { buttonClasses, focusRing, textLinkClass } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { googleSignInUrl, login } from "../api";
import { ROLE_HOME } from "../types";
import { RoleSegmented } from "./role-picker";

function remainingAttempts(error) {
  const value = error.details?.remainingAttempts;
  return typeof value === "number" ? value : null;
}

export function LoginForm() {
  const navigate = useNavigate();
  const [portal, setPortal] = useState("CUSTOMER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    const result = await login({ email, password, rememberMe, portal });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(ROLE_HOME[result.data.role]);
  }

  const credentialsRejected = error?.code === "INVALID_CREDENTIALS";
  const attemptsLeft = error ? remainingAttempts(error) : null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <RoleSegmented
          name="portal"
          legend="เข้าสู่ระบบในฐานะ"
          value={portal}
          onChange={setPortal}
        />

        {error && (
          <Alert
            tone="error"
            title={credentialsRejected ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : error.message}
          >
            {attemptsLeft !== null &&
              `ลองอีกครั้งได้อีก ${attemptsLeft} ครั้งก่อนบัญชีถูกล็อกชั่วคราว`}
          </Alert>
        )}

        <TextField
          id="login-email"
          name="email"
          type="email"
          label="อีเมล"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          required
          value={email}
          invalid={credentialsRejected}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordField
          id="login-password"
          name="password"
          label="รหัสผ่าน"
          autoComplete="current-password"
          required
          value={password}
          invalid={credentialsRejected}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between gap-4">
          <Checkbox
            id="login-remember"
            name="rememberMe"
            label="จำฉันไว้"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <Link to="/forgot-password" className={`${textLinkClass} text-sm`}>
            ลืมรหัสผ่าน?
          </Link>
        </div>

        <Button type="submit" fullWidth disabled={pending} aria-busy={pending}>
          {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link
          to={ROLE_HOME.CUSTOMER}
          className={`rounded text-ink underline-offset-4 hover:underline ${focusRing}`}
        >
          ไปที่หน้า Customer Home <span aria-hidden="true">→</span>
        </Link>
      </p>

      <div className="flex items-center gap-4 text-sm text-muted/80" role="separator">
        <span className="h-0.5 flex-1 rounded-full bg-butter" />
        หรือ
        <span className="h-0.5 flex-1 rounded-full bg-butter" />
      </div>
      <a
        href={googleSignInUrl(portal)}
        className={buttonClasses({ variant: "secondary", fullWidth: true })}
      >
        <GoogleIcon className="size-5 text-apricot-ink" />
        เข้าสู่ระบบด้วย Google
      </a>

      <p className="text-center text-sm text-muted">
        ยังไม่มีบัญชี?{" "}
        <Link
          to={portal === "MERCHANT" ? "/register?role=merchant" : "/register"}
          className={textLinkClass}
        >
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}
