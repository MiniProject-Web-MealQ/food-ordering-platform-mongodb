import { useEffect, useState } from "react";
import { getJson, patchJson } from "@/lib/api-client";
import { loadNotificationPreferences, saveNotificationPreferences } from "../notification-preferences";

export function EmailOrderSettings({ userId, email, merchant = false }) {
  const [state, setState] = useState({ owner: null, data: null, busy: false, error: "", message: "" });
  const [attempt, setAttempt] = useState(0);
  const current = state.owner === userId ? state.data : null;
  useEffect(() => {
    let disposed = false;
    if (!userId) return undefined;
    loadNotificationPreferences(getJson).then((data) => { if (!disposed) setState({ owner: userId, data, busy: false, error: "", message: "" }); }).catch((error) => { if (!disposed) setState({ owner: userId, data: null, busy: false, error: error.message, message: "" }); });
    return () => { disposed = true; };
  }, [userId, attempt]);
  async function save(enabled) {
    setState((value) => ({ ...value, busy: true, error: "", message: "" }));
    try {
      const data = await saveNotificationPreferences(patchJson, enabled);
      setState({ owner: userId, data, busy: false, error: "", message: data.emailOrders ? "เปิดอีเมลสำหรับออเดอร์ถัดจากนี้แล้ว" : "ปิดอีเมลแจ้งเตือนออเดอร์แล้ว" });
    } catch (error) { setState((value) => ({ ...value, busy: false, error: error.message || "บันทึกไม่สำเร็จ" })); }
  }
  const canEnable = current?.emailVerified && current?.emailAvailable;
  return <section className="space-y-3 rounded-3xl bg-cream p-5">
    <h2 className="font-bold">แจ้งเตือนออเดอร์ทางอีเมล</h2>
    <p className="text-sm text-ink-soft">{merchant ? "เจ้าของร้านรับออเดอร์ใหม่ การยกเลิกโดยลูกค้า และการรับอาหาร" : "รับสถานะคำสั่งซื้อของคุณ"} ไปที่ <span className="break-all">{email}</span> แยกจากการแจ้งเตือนบนอุปกรณ์ เริ่มส่งเฉพาะเหตุการณ์หลังเปิดใช้</p>
    {current ? <>
      <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={current.emailOrders} disabled={state.busy || (!current.emailOrders && !canEnable)} onChange={(event) => save(event.target.checked)} className="size-5 accent-brand" />{state.busy ? "กำลังบันทึก…" : "รับอีเมลแจ้งเตือนออเดอร์"}</label>
      <p className="text-sm text-ink-soft">{current.emailVerified ? "อีเมลบัญชีนี้ยืนยันแล้ว" : "ต้องยืนยันอีเมลบัญชีก่อนเปิดใช้งาน สมัครด้วย OTP หรือใช้ Google Login ด้วยอีเมลที่ยืนยันแล้ว"}</p>
      {!current.emailAvailable && <p className="text-sm text-danger">ยังส่งไปยังอีเมลนี้ไม่ได้ อีเมลตัวอย่างใช้รับเมลไม่ได้ หรือระบบส่งเมลยังไม่พร้อม</p>}
    </> : !state.error && <p role="status" className="text-sm">กำลังโหลดการตั้งค่าอีเมล…</p>}
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    {state.error && <button type="button" disabled={state.busy} onClick={() => current ? save(!current.emailOrders) : setAttempt((value) => value + 1)} className="text-sm underline disabled:opacity-50">ลองอีกครั้ง</button>}
    {state.message && <p role="status" className="text-sm">{state.message}</p>}
  </section>;
}
