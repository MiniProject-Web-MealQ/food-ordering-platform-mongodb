import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { focusRing, textLinkClass } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { login } from "@/features/auth/api";
import { getSession, logout } from "@/features/merchant/api";
import { SEED_MERCHANT } from "@/features/merchant/constants";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const destination = location.state?.from ?? "/merchant/dashboard";

  // Already signed in as a merchant (cookie session): skip the form.
  useEffect(() => {
    let active = true;
    getSession().then((result) => {
      if (active && result.ok && result.data?.user?.role === "MERCHANT") navigate(destination, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [destination, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    if (!email.trim() || !password) {
      setError({ title: "กรอกอีเมลและรหัสผ่านให้ครบ" });
      return;
    }
    setPending(true);
    setError(null);
    const result = await login({ email, password, rememberMe: true, portal: "MERCHANT" });
    if (!result.ok) {
      setPending(false);
      const { code, message } = result.error;
      const title =
        code === "INVALID_CREDENTIALS"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : code === "ROLE_MISMATCH"
            ? "บัญชีนี้เป็นบัญชีลูกค้า ใช้เข้าหน้าร้านค้าไม่ได้"
            : message;
      setError({ title, invalid: code === "INVALID_CREDENTIALS" || code === "ROLE_MISMATCH" });
      return;
    }
    if (result.data.role !== "MERCHANT") {
      // The API let a customer in: close that session so the merchant pages do not pick it up.
      await logout();
      setPending(false);
      setError({ title: "บัญชีนี้เป็นบัญชีลูกค้า ใช้เข้าหน้าร้านค้าไม่ได้", invalid: true });
      return;
    }
    navigate(destination, { replace: true });
  }

  function fillSeedAccount() {
    setEmail(SEED_MERCHANT.email);
    setPassword(SEED_MERCHANT.password);
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
            {!error && location.state?.reason === "session-lost" && (
              <Alert tone="error" title="ต้องเข้าสู่ระบบร้านค้าอีกครั้ง">
                เบราว์เซอร์นี้ถูก login เป็นบัญชีอื่น (เช่น บัญชีลูกค้า) หรือ session หมดอายุ
                ถ้าจะลองคู่กับฝั่งลูกค้า ให้เปิดคนละเบราว์เซอร์ หรือใช้หน้าต่าง Incognito
              </Alert>
            )}
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
            <Button type="submit" variant="cocoa" fullWidth disabled={pending} aria-busy={pending}>
              {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </Button>
          </form>

          {/* Dev builds only: the account `npm run seed` creates in backend/. */}
          {import.meta.env.DEV && (
            <div className="rounded-3xl bg-cream p-4 text-sm text-ink-soft ring-1 ring-haze">
              <p className="font-semibold text-ink">บัญชีทดสอบ (หลังรัน npm run seed)</p>
              <p className="mt-1 break-all">
                {SEED_MERCHANT.email} · {SEED_MERCHANT.password}
              </p>
              <button type="button" onClick={fillSeedAccount} className={`mt-2 ${textLinkClass}`}>
                กรอกให้อัตโนมัติ
              </button>
            </div>
          )}

          <div className="space-y-2 text-center text-sm text-ink-soft">
            <p>
              ยังไม่มีบัญชีร้าน?{" "}
              <Link to="/register?role=merchant" className={textLinkClass}>
                สมัครเปิดร้าน
              </Link>
            </p>
            <p>
              ไม่ใช่ร้านค้า?{" "}
              <Link to="/login" className={textLinkClass}>
                เข้าสู่ระบบลูกค้า
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default MerchantLogin;
