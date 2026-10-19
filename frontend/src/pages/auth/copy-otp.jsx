import { useEffect, useState } from "react";
import { Check, ClipboardCopy, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { clearCopyOtpUrl, copyOtp, otpFromFragment } from "@/features/auth/copy-otp";
import { usePageTitle } from "@/lib/use-page-title";

export default function CopyOtpPage() {
  usePageTitle("คัดลอกรหัส OTP");
  // The initializer is pure: both StrictMode render passes see the original
  // fragment. The effect clears the URL only after React has retained the code.
  const [code] = useState(() => otpFromFragment(window.location.hash));
  const [status, setStatus] = useState("idle");
  useEffect(() => { clearCopyOtpUrl(window.history, window.location); }, []);

  async function handleCopy() {
    if (!code || status === "copying") return;
    setStatus("copying");
    setStatus(await copyOtp(code, navigator.clipboard));
  }
  const failed = status === "failed" || status === "unsupported";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-4 py-10 text-ink">
      <meta name="referrer" content="no-referrer" />
      <meta name="robots" content="noindex, nofollow" />
      <section className="w-full max-w-md rounded-4xl border border-line bg-white p-6 shadow-card sm:p-9">
        <Logo />
        <div className="mt-9 inline-flex size-12 items-center justify-center rounded-2xl bg-mint text-cocoa"><ShieldCheck aria-hidden="true" size={25} /></div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">คัดลอกรหัส OTP</h1>
        <p className="mt-3 text-sm leading-7 text-ink-soft">คัดลอกรหัสจากอีเมล แล้วกลับไปกรอกในแท็บที่คุณกำลังสมัครสมาชิกหรือเปลี่ยนอีเมล</p>

        {code ? (
          <div className="mt-6 rounded-3xl border border-leaf bg-snow px-3 py-6 text-center">
            <label htmlFor="copy-otp-code" className="text-xs font-semibold text-cocoa">รหัสยืนยัน 6 หลัก</label>
            <input id="copy-otp-code" readOnly value={code} aria-label="รหัส OTP สำหรับคัดลอก" autoComplete="off" spellCheck={false} dir="ltr" onFocus={(event) => event.target.select()} className="mt-3 block w-full rounded-xl border-0 bg-transparent py-2 text-center font-mono text-4xl font-bold tracking-[0.25em] text-ink selection:bg-leaf focus-visible:outline-2 focus-visible:outline-cocoa" />
            <p className="mt-2 text-xs leading-6 text-ink-soft">รหัสมีอายุ 10 นาทีตามอีเมลที่ได้รับ</p>
          </div>
        ) : (
          <div role="alert" className="mt-6 rounded-2xl bg-haze p-5 text-sm leading-7 text-ink-soft">ไม่พบรหัสที่พร้อมคัดลอก กรุณาเปิดปุ่ม “เปิดหน้าคัดลอกรหัส” จากอีเมล MealQ ล่าสุดอีกครั้ง</div>
        )}

        <Button fullWidth variant="cocoa" className="mt-5" disabled={!code || status === "copying"} onClick={handleCopy}>
          {status === "copied" ? <Check size={18} aria-hidden="true" /> : <ClipboardCopy size={18} aria-hidden="true" />}
          {status === "copying" ? "กำลังคัดลอก…" : status === "copied" ? "คัดลอกรหัสแล้ว" : "คัดลอกรหัส OTP"}
        </Button>
        <div role="status" aria-live="polite" className="mt-3 text-sm leading-7">
          {status === "copied" && <p className="text-cocoa">คัดลอกสำเร็จแล้ว กลับไปแท็บเดิมแล้ววางรหัสเพื่อยืนยันได้เลย</p>}
          {failed && <p className="text-danger">เบราว์เซอร์ไม่อนุญาตให้คัดลอกผ่านปุ่ม แตะที่รหัสด้านบนแล้วเลือกคัดลอกด้วยตัวเองได้</p>}
        </div>
        <div className="mt-7 border-t border-line pt-5 text-xs leading-6 text-ink-soft">
          <p>หน้านี้ช่วยคัดลอกรหัสเท่านั้น ยังไม่ได้ยืนยันบัญชีให้คุณ กรุณากลับไปยืนยันในแท็บเดิม</p>
          <p className="mt-2">หากรหัสใช้ไม่ได้หรือหมดอายุ ให้ขอรหัสใหม่จากแท็บเดิม และอย่าเปิดเผยรหัสให้ผู้อื่น</p>
        </div>
      </section>
    </main>
  );
}
