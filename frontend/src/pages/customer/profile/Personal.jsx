import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { UserRound } from "lucide-react";
import { buttonClasses, focusRing, textLinkClass } from "@/components/ui/styles";
import { saveProfile } from "@/features/customer/api";
import { useCustomer } from "@/features/customer/store";

const inputClass = `mt-2 w-full min-w-0 rounded-2xl border border-haze bg-white px-4 py-3 text-ink disabled:bg-haze/50 ${focusRing}`;

function Personal() {
  const { state, dispatch } = useCustomer();
  const [name, setName] = useState(state.user?.name || "");
  const [phone, setPhone] = useState(state.user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const nextName = name.trim();
    const nextPhone = phone.replace(/[\s-]/g, "");
    if (!nextName || nextName.length > 100) {
      setFeedback({ kind: "error", text: "กรอกชื่อให้มีความยาว 1–100 ตัวอักษร" });
      return;
    }
    if (nextPhone && !/^\+?[0-9]{8,15}$/.test(nextPhone)) {
      setFeedback({ kind: "error", text: "กรอกเบอร์โทร 8–15 หลัก โดยใส่ + หน้าหมายเลขได้" });
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await saveProfile({ name: nextName, phone: nextPhone || null });
      if (!mounted.current) return;
      if (!result.ok || !result.data?.user) {
        setFeedback({ kind: "error", text: result.error?.message || "บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง" });
        return;
      }
      dispatch({ type: "profile/set", user: result.data.user });
      setName(result.data.user.name || nextName);
      setPhone(result.data.user.phone || "");
      setFeedback({ kind: "success", text: "บันทึกข้อมูลส่วนตัวแล้ว" });
    } catch {
      if (mounted.current) setFeedback({ kind: "error", text: "เชื่อมต่อไม่สำเร็จ ยังยืนยันการบันทึกไม่ได้ กรุณาลองอีกครั้ง" });
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSave} aria-busy={saving} className="rounded-3xl border border-haze bg-white p-5 sm:p-7">
        <div className="mb-5 flex items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-cocoa"><UserRound className="size-5" /></span>
          <div><h2 className="text-lg font-bold text-ink">ชื่อและเบอร์ติดต่อ</h2><p className="mt-1 text-sm leading-relaxed text-ink-soft">ข้อมูลที่ใช้แสดงในบัญชีและคำสั่งซื้อของคุณ</p></div>
        </div>
        <fieldset disabled={saving} className="space-y-5">
          <legend className="sr-only">แก้ไขข้อมูลส่วนตัว</legend>
          <label htmlFor="profile-personal-name" className="block text-sm font-semibold text-ink">
            ชื่อที่แสดง
            <input id="profile-personal-name" name="name" required minLength={1} maxLength={100} autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setFeedback(null); }} className={inputClass} />
          </label>
          <div>
            <label htmlFor="profile-personal-phone" className="block text-sm font-semibold text-ink">เบอร์โทร <span className="font-normal text-ink-soft">(ไม่บังคับ)</span></label>
            <input id="profile-personal-phone" name="phone" type="tel" inputMode="tel" maxLength={25} autoComplete="tel" aria-describedby="profile-personal-phone-hint" value={phone} onChange={(event) => { setPhone(event.target.value); setFeedback(null); }} className={inputClass} />
            <p id="profile-personal-phone-hint" className="mt-2 text-xs leading-relaxed text-ink-soft">หมายเลข 8–15 หลัก ใส่ + เว้นวรรค หรือขีดคั่นได้ เว้นว่างเพื่อลบเบอร์เดิม</p>
          </div>
          <button type="submit" disabled={saving} className={buttonClasses({ variant: "cocoa", size: "md" })}>{saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</button>
        </fieldset>
        {feedback && <p role={feedback.kind === "error" ? "alert" : "status"} className={`mt-4 text-sm leading-relaxed ${feedback.kind === "error" ? "text-danger" : "text-brand-ink"}`}>{feedback.text}</p>}
      </form>

      <section aria-labelledby="profile-personal-email-title" className="rounded-3xl bg-cream p-5 sm:p-7">
        <h2 id="profile-personal-email-title" className="font-bold text-ink">อีเมลของบัญชี</h2>
        <p className="mt-2 break-all text-sm text-ink">{state.user?.email}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">การเปลี่ยนอีเมลต้องยืนยันอีเมลใหม่ด้วย OTP เพื่อให้ส่งข้อมูลออเดอร์ถึงคุณได้ถูกต้อง</p>
        <Link to="/customer/profile/security" className={`${textLinkClass} mt-3 inline-block text-sm`}>ไปเปลี่ยนอีเมลและจัดการความปลอดภัย</Link>
      </section>
    </div>
  );
}

export default Personal;
