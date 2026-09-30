import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { focusRing, textLinkClass } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { DEMO_ACCOUNT } from "@/features/merchant/mock-data";
import { readSession, signIn } from "@/features/merchant/store";
import { usePageTitle } from "@/lib/use-page-title";

const HIGHLIGHTS = [
  "เห็นคิวทั้งหมดของวันในกระดานเดียว",
  "กดเลื่อนสถานะ ลูกค้าได้แจ้งเตือนทันที",
  "ปิดเมนูที่หมดได้ในคลิกเดียว",
];

const BOARD_PREVIEW = [
  { label: "รอรับ", count: 3 },
  { label: "กำลังทำ", count: 3 },
  { label: "พร้อมรับ", count: 2 },
];

/** Brand panel beside the form on large screens. Decorative only. */
function MerchantShowcase() {
  return (
    <aside className="relative hidden overflow-hidden bg-mint lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -bottom-28 size-96 rounded-full bg-leaf/60" />
      <div className="relative">
        <Logo />
      </div>
      <div className="relative max-w-lg space-y-8">
        <div className="space-y-4">
          <p className="text-5xl leading-[1.2] font-bold text-ink xl:text-6xl">
            จัดการคิว
            <br />
            ให้ครัวไม่วุ่น
          </p>
          <ul className="space-y-2 text-lg text-ink/80">
            {HIGHLIGHTS.map((text) => (
              <li key={text} className="flex items-center gap-3">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-brand" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden="true" className="grid max-w-sm grid-cols-3 gap-3 rounded-4xl bg-white p-5 shadow-card">
          {BOARD_PREVIEW.map((column) => (
            <div key={column.label} className="rounded-2xl bg-cream p-3 text-center">
              <p className="text-3xl font-bold text-cocoa">{column.count}</p>
              <p className="text-xs text-ink-soft">{column.label}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="relative text-sm text-ink-soft">© 2026 MealQ · สำหรับร้านค้า</p>
    </aside>
  );
}

function MerchantLogin() {
  usePageTitle("เข้าสู่ระบบร้านค้า");
  const navigate = useNavigate();
  const location = useLocation();
  const [alreadySignedIn] = useState(() => Boolean(readSession()));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const destination = location.state?.from ?? "/merchant/dashboard";

  if (alreadySignedIn) return <Navigate to={destination} replace />;

  function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError({ title: "กรอกอีเมลและรหัสผ่านให้ครบ" });
      return;
    }
    // MOCK: replace with login() from features/auth/api.js using portal "MERCHANT".
    const matches = email.trim().toLowerCase() === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password;
    if (!matches) {
      setError({ title: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", invalid: true });
      return;
    }
    signIn({ email: DEMO_ACCOUNT.email, name: DEMO_ACCOUNT.name, signed_in_at: Date.now() });
    navigate(destination, { replace: true });
  }

  function fillDemo() {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setError(null);
  }

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-page lg:grid lg:grid-cols-2 lg:bg-white">
      <MerchantShowcase />
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12 lg:px-12 lg:py-16">
        <div className="w-full max-w-md space-y-6 rounded-4xl bg-white px-6 py-8 shadow-card sm:px-8 sm:py-10 lg:rounded-none lg:p-0 lg:shadow-none">
          <header className="space-y-2">
            <Link to="/" aria-label="MealQ หน้าแรก" className={`mb-4 inline-block rounded-full lg:hidden ${focusRing}`}>
              <LogoMark className="size-14 text-2xl" />
            </Link>
            <p className="text-sm font-semibold text-brand-ink">สำหรับร้านค้า</p>
            <h1 className="text-3xl leading-tight font-bold text-ink sm:text-4xl">เข้าสู่ระบบร้านค้า</h1>
            <p className="text-ink-soft">จัดการออเดอร์ คิว และเมนูของร้านคุณ</p>
          </header>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && <Alert tone="error" title={error.title} />}
            <TextField
              id="merchant-email"
              name="email"
              type="email"
              label="อีเมลร้านค้า"
              autoComplete="email"
              inputMode="email"
              placeholder="shop@example.com"
              required
              value={email}
              invalid={error?.invalid}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordField
              id="merchant-password"
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

          {/* MOCK: demo credentials; remove once merchant accounts come from the API. */}
          <div className="rounded-3xl bg-cream p-4 text-sm text-ink-soft ring-1 ring-haze">
            <p className="font-semibold text-ink">บัญชีทดลอง (ร้านป้าแดง)</p>
            <p className="mt-1 break-all">
              {DEMO_ACCOUNT.email} · {DEMO_ACCOUNT.password}
            </p>
            <button type="button" onClick={fillDemo} className={`mt-2 ${textLinkClass}`}>
              กรอกให้อัตโนมัติ
            </button>
          </div>

          <p className="text-center text-sm text-ink-soft">
            ไม่ใช่ร้านค้า?{" "}
            <Link to="/login" className={textLinkClass}>
              เข้าสู่ระบบลูกค้า
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default MerchantLogin;
