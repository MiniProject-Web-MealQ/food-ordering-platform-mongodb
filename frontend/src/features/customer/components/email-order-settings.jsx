import { useEffect, useRef, useState } from "react";
import { getJson, patchJson } from "@/lib/api-client";
import { loadNotificationPreferences, saveNotificationPreferences } from "../notification-preferences";
import { createSettingsScope, emailSettingsOperations } from "../notification-settings-lifecycle";

export function EmailOrderSettings({ userId, email, merchant = false }) {
  return <AccountEmailOrderSettings key={userId || "signed-out"} userId={userId} email={email} merchant={merchant} />;
}

function AccountEmailOrderSettings({ userId, email, merchant }) {
  const [state, setState] = useState({ owner: null, data: null, busy: false, error: "", message: "" });
  const [attempt, setAttempt] = useState(0);
  const scopeRef = useRef(null);
  const pending = useRef(false);
  const current = state.owner === userId ? state.data : null;
  useEffect(() => {
    if (!userId) return undefined;
    const scope = createSettingsScope();
    scopeRef.current = scope;
    emailSettingsOperations.run(() => scope.isCurrent() ? loadNotificationPreferences(getJson) : null).then((data) => { if (scope.isCurrent() && data) setState({ owner: userId, data, busy: false, error: "", message: "" }); }).catch((error) => { if (scope.isCurrent()) setState({ owner: userId, data: null, busy: false, error: error.message, message: "" }); });
    return () => { scope.dispose(); };
  }, [userId, attempt]);
  async function save(enabled) {
    const scope = scopeRef.current;
    if (!scope?.isCurrent() || pending.current) return;
    pending.current = true;
    setState((value) => ({ ...value, busy: true, error: "", message: "" }));
    try {
      const data = await emailSettingsOperations.run(() => scope.isCurrent() ? saveNotificationPreferences(patchJson, enabled) : null);
      if (scope.isCurrent() && data) setState({ owner: userId, data, busy: false, error: "", message: data.emailOrders ? "เปิดอีเมลสำหรับออเดอร์ถัดจากนี้แล้ว" : "ปิดอีเมลแจ้งเตือนออเดอร์แล้ว" });
    } catch (error) { if (scope.isCurrent()) setState((value) => ({ ...value, busy: false, error: error.message || "บันทึกไม่สำเร็จ" })); }
    finally { pending.current = false; }
  }
  const canEnable = current?.emailVerified && current?.emailAvailable;
  return <section className="space-y-3 rounded-3xl bg-cream p-5">
    <h2 className="font-bold">แจ้งเตือนออเดอร์ทางอีเมล</h2>
    <p className="text-sm text-ink-soft">{merchant ? "เจ้าของร้านรับออเดอร์ใหม่ การยกเลิกโดยลูกค้า และการรับอาหาร" : "รับอีเมลเมื่อสั่งซื้อสำเร็จ ร้านยืนยัน กำลังทำอาหาร พร้อมรับ รับอาหารแล้ว หรือออเดอร์ถูกยกเลิก"} ไปที่ <span className="break-all">{email}</span> แยกจากการแจ้งเตือนบนอุปกรณ์ เริ่มส่งเฉพาะเหตุการณ์หลังเปิดใช้</p>
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
