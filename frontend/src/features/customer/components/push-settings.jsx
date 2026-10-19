import { useEffect, useState } from "react";
import { getJson, postJson } from "@/lib/api-client";
import { disablePush, enablePush, reconcileExistingPush, supportsPush } from "../push-subscription";
import { pushPlatform } from "../push-platform";
import { MobilePushGuide } from "./mobile-push-guide";
export function PushSettings({ userId, prefix = "/customer" }) {
  const platform = pushPlatform();
  const supported = supportsPush();
  const [status, setStatus] = useState({ owner: null, enabled: false, busy: false, message: "", retry: null });
  const enabled = status.owner === userId && status.enabled;
  const busy = supported && (status.owner !== userId || status.busy);
  useEffect(() => {
    let disposed = false;
    if (!userId) return undefined;
    reconcileExistingPush({ postJson, prefix }).then((enabled) => {
      if (!disposed) setStatus({ owner: userId, enabled, busy: false, message: "", retry: null });
    }).catch((error) => {
      if (!disposed) setStatus({ owner: userId, enabled: false, busy: false, message: error.message || "ตรวจสอบแจ้งเตือนไม่สำเร็จ", retry: "check" });
    });
    return () => { disposed = true; };
  }, [userId, prefix]);
  async function apply(action) {
    setStatus((current) => ({ ...current, owner: userId, busy: true, message: "", retry: null }));
    try {
      const next = action === "disable" ? await disablePush({ postJson, prefix }) : action === "enable" ? await enablePush({ getJson, postJson, prefix }) : await reconcileExistingPush({ postJson, prefix });
      setStatus({ owner: userId, enabled: next, busy: false, message: next ? "เปิดแจ้งเตือนออเดอร์บนอุปกรณ์นี้แล้ว" : "ปิดแจ้งเตือนอุปกรณ์นี้แล้ว", retry: null });
    } catch (error) {
      setStatus((current) => ({ ...current, busy: false, message: error.message || "ตั้งค่าไม่สำเร็จ", retry: action }));
    }
  }
  return <section className="space-y-3 rounded-3xl bg-cream p-5"><h2 className="font-bold">แจ้งเตือนเมื่อปิดหน้าเว็บ</h2><p className="text-sm text-ink-soft">{prefix === "/merchant" ? "เจ้าของร้านรับออเดอร์ใหม่ การยกเลิกโดยลูกค้า และการรับอาหารบนอุปกรณ์นี้" : "รับสถานะออเดอร์บนอุปกรณ์นี้"} ต้องอนุญาตแจ้งเตือนก่อน</p><button type="button" disabled={!supported || busy || !userId} onClick={() => apply(enabled ? "disable" : "enable")} className="rounded-full bg-cocoa px-4 py-2 text-white disabled:opacity-50">{busy ? "กำลังตั้งค่า…" : enabled ? "ปิดแจ้งเตือนอุปกรณ์นี้" : "เปิดแจ้งเตือนอุปกรณ์นี้"}</button>{!supported && !platform.needsInstall && !platform.oldIOS && <p className="text-sm">เบราว์เซอร์หรือโหมดนี้ยังไม่รองรับ Web Push ลองเปิด Safari/Chrome รุ่นปัจจุบันตามขั้นตอนด้านล่าง หรือเลือกอีเมล</p>}{status.message && <p role={status.retry ? "alert" : "status"} className="text-sm">{status.message}</p>}{status.retry && <button type="button" disabled={busy} className="text-sm underline disabled:opacity-50" onClick={() => apply(status.retry)}>ลองอีกครั้ง</button>}<MobilePushGuide platform={platform} /></section>;
}
