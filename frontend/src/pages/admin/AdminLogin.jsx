import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { focusRing } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { MockBadge } from "@/features/admin/components/badges";
import { DEMO_ADMIN_PASSWORD } from "@/features/admin/mock-data";
import { loadState, readSession, signIn } from "@/features/admin/store";
import { usePageTitle } from "@/lib/use-page-title";

/** แสดงเฉพาะตอน dev (npm run dev): ลิงก์กรอกบัญชีทดสอบ ตอน build จริงเป็น null และถูกตัดออก */
const DEV_ACCOUNT = import.meta.env.DEV ? { email: "admin@mealq.local", password: DEMO_ADMIN_PASSWORD } : null;

function AdminLogin() {
  usePageTitle("เข้าสู่ระบบผู้ดูแล");
  const navigate = useNavigate();
  const location = useLocation();
  const [alreadySignedIn] = useState(() => Boolean(readSession()));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const destination = location.state?.from ?? "/admin";
  if (alreadySignedIn) return <Navigate to={destination} replace />;

  function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError({ title: "กรอกอีเมลและรหัสผ่านให้ครบ" });
      return;
    }
    // MOCK: เทียบกับรายชื่อผู้ใช้ในข้อมูลจำลอง รอ POST /auth/login { portal: "ADMIN" }
    const user = loadState().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || (user.role === "admin" && password !== DEMO_ADMIN_PASSWORD)) {
      setError({ title: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", invalid: true });
      return;
    }
    if (user.role !== "admin") {
      setError({ title: "บัญชีนี้ไม่ใช่ผู้ดูแลระบบ", detail: "บัญชีร้านค้าและลูกค้าใช้หน้านี้ไม่ได้", invalid: true });
      return;
    }
    if (user.status !== "active") {
      setError({ title: "บัญชีนี้ถูกระงับ", detail: "ติดต่อผู้ดูแลระบบคนอื่นเพื่อเปิดใช้งาน" });
      return;
    }
    signIn({ user_id: user._id, name: user.name, email: user.email, signed_in_at: Date.now() });
    navigate(destination, { replace: true });
  }

  function fillDevAccount() {
    if (!DEV_ACCOUNT) return;
    setEmail(DEV_ACCOUNT.email);
    setPassword(DEV_ACCOUNT.password);
    setError(null);
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-forest px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-4xl bg-white px-6 py-8 shadow-card sm:px-8 sm:py-10">
        <header className="space-y-2">
          <span aria-hidden="true" className="mb-4 grid size-14 place-items-center rounded-full bg-forest text-brand">
            <ShieldCheck className="size-7" />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-brand-ink">MealQ · ผู้ดูแลระบบ</p>
            <MockBadge />
          </div>
          <h1 className="text-3xl leading-tight font-bold text-ink">เข้าสู่ระบบผู้ดูแล</h1>
          <p className="text-ink-soft">สำหรับทีมดูแลเว็บไซต์เท่านั้น บัญชีผู้ดูแลเพิ่มได้โดยผู้ดูแลคนอื่น</p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {error && (
            <Alert tone="error" title={error.title}>
              {error.detail}
            </Alert>
          )}
          <TextField
            id="admin-email"
            name="email"
            type="email"
            label="อีเมล"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            invalid={error?.invalid}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            id="admin-password"
            name="password"
            label="รหัสผ่าน"
            autoComplete="current-password"
            required
            value={password}
            invalid={error?.invalid}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="cocoa" fullWidth>
            เข้าสู่ระบบ
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm text-ink-soft">
          <p>
            <Link to="/" className={`rounded underline-offset-4 hover:underline ${focusRing}`}>
              กลับหน้าแรก MealQ
            </Link>
          </p>
          {DEV_ACCOUNT && (
            <p className="pt-2">
              <button
                type="button"
                onClick={fillDevAccount}
                className={`rounded text-xs text-ink-soft underline underline-offset-4 hover:text-ink ${focusRing}`}
              >
                ใช้บัญชีทดสอบ
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default AdminLogin;
