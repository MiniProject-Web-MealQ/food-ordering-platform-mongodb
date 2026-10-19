import { useEffect, useState } from "react";
import { PageHeader } from "@/features/customer/components/page-header";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { buttonClasses } from "@/components/ui/styles";
import { getJson, patchJson } from "@/lib/api-client";
import { usePageTitle } from "@/lib/use-page-title";

function SettingsForm({ data }) {
  const [fee, setFee] = useState(String(data.settings.service_fee));
  const [accepting, setAccepting] = useState(data.settings.accepting_orders);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await patchJson("/admin/settings", { service_fee: Number(fee), accepting_orders: accepting });
    setMessage(result.ok ? "บันทึกการตั้งค่าแล้ว" : result.error.message);
    setBusy(false);
  }
  return <>
    <form onSubmit={save} className={`${panelClass} space-y-5`}>
      <label className="block font-semibold">ค่าบริการต่อออเดอร์ (บาท)<input type="number" required min="0" max="1000" step="0.01" value={fee} onChange={(event) => setFee(event.target.value)} className="mt-2 block w-full max-w-xs rounded-xl border border-haze p-3" /></label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={accepting} onChange={(event) => setAccepting(event.target.checked)} className="size-5 accent-brand" />เปิดรับออเดอร์ใหม่ทั้งระบบ</label>
      <p className="text-sm text-ink-soft">การเปลี่ยนค่าบริการมีผลกับออเดอร์ใหม่ ออเดอร์ที่สั่งแล้วทำต่อได้แม้หยุดรับออเดอร์</p>
      <button disabled={busy} className={buttonClasses({ variant: "cocoa" })}>{busy ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}</button>
      {message && <p role="status">{message}</p>}
    </form>
    <section className={`${panelClass} space-y-2`}>
      <h2 className="font-bold">สถานะบริการ</h2>
      <p>Google Login: {data.services.google ? "ตั้งค่าแล้ว" : "ยังไม่ได้เชื่อมต่อ"}</p>
      <p>อีเมล: {data.services.email ? "ตั้งค่าแล้ว" : "ยังไม่ได้เชื่อมต่อ SMTP"}</p>
      <p>การชำระเงิน: {data.services.paymentMode === "sandbox" ? "Demo — PromptPay และ Wallet (ลูกค้าเพิ่มยอดเองได้)" : "Wallet"}</p>
      <p className="text-sm text-ink-soft">ผู้ดูแลเซิร์ฟเวอร์เป็นผู้ตั้งค่าการเชื่อมต่อ Google และอีเมล ยังไม่เปิดรับเงินผ่านบัตรหรือธนาคารจริง</p>
    </section>
  </>;
}

export default function Settings() {
  usePageTitle("ตั้งค่าระบบ");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    getJson("/admin/settings").then((result) => {
      if (!active) return;
      if (result.ok) { setData(result.data); setError(""); }
      else setError(result.error.message);
    });
    return () => { active = false; };
  }, [attempt]);
  return <div className={`${pageClass} space-y-4`}><PageHeader title="ตั้งค่าระบบ" />
    {error ? <p role="alert">{error} <button onClick={() => setAttempt((value) => value + 1)} className="underline">ลองอีกครั้ง</button></p> : data ? <SettingsForm data={data} /> : <p role="status">กำลังโหลดการตั้งค่า…</p>}
  </div>;
}
