import { useEffect, useRef, useState } from "react";
import { getJson, postJson } from "@/lib/api-client";
import { disablePush, enablePush, reconcileExistingPush, supportsPush } from "../push-subscription";
import { pushPlatform } from "../push-platform";
import { MobilePushGuide } from "./mobile-push-guide";
import { createSettingsScope, pushPermissionFromGesture, pushSettingsOperations } from "../notification-settings-lifecycle";
export function PushSettings({ userId, prefix = "/customer" }) {
  return <AccountPushSettings key={`${prefix}:${userId || "signed-out"}`} userId={userId} prefix={prefix} />;
}
function AccountPushSettings({ userId, prefix }) {
  const platform = pushPlatform();
  const supported = supportsPush();
  const [status, setStatus] = useState({ owner: null, enabled: false, busy: false, message: "", retry: null });
  const scopeRef = useRef(null);
  const pending = useRef(false);
  const enabled = status.owner === userId && status.enabled;
  const busy = supported && (status.owner !== userId || status.busy);
  useEffect(() => {
    if (!userId) return undefined;
    const scope = createSettingsScope();
    scopeRef.current = scope;
    pushSettingsOperations.run(() => scope.isCurrent() ? reconcileExistingPush({ postJson, prefix }) : null).then((enabled) => {
      if (scope.isCurrent() && enabled !== null) setStatus({ owner: userId, enabled, busy: false, message: "", retry: null });
    }).catch((error) => {
      if (scope.isCurrent()) setStatus({ owner: userId, enabled: false, busy: false, message: error.message || "ตรวจสอบแจ้งเตือนไม่สำเร็จ", retry: "check" });
    });
    return () => { scope.dispose(); };
  }, [userId, prefix]);
  async function apply(action) {
    const scope = scopeRef.current;
    if (!scope?.isCurrent() || pending.current) return;
    pending.current = true;
    setStatus((current) => ({ ...current, owner: userId, busy: true, message: "", retry: null }));
    try {
      const permission = action === "enable" ? pushPermissionFromGesture() : null;
      const next = await pushSettingsOperations.run(async () => {
        if (!scope.isCurrent()) return null;
        if (permission) {
          const decision = await permission;
          if (decision.error) throw decision.error;
          if (decision.permission !== "granted") throw new Error("กรุณาอนุญาตแจ้งเตือนในการตั้งค่าเบราว์เซอร์");
          if (!scope.isCurrent()) return null;
        }
        return action === "disable" ? disablePush({ postJson, prefix }) : action === "enable" ? enablePush({ getJson, postJson, prefix }) : reconcileExistingPush({ postJson, prefix });
      });
      if (scope.isCurrent() && next !== null) setStatus({ owner: userId, enabled: next, busy: false, message: next ? "เปิดแจ้งเตือนออเดอร์บนอุปกรณ์นี้แล้ว" : "ปิดแจ้งเตือนอุปกรณ์นี้แล้ว", retry: null });
    } catch (error) {
      if (scope.isCurrent()) setStatus((current) => ({ ...current, busy: false, message: error.message || "ตั้งค่าไม่สำเร็จ", retry: action }));
    }
    finally { pending.current = false; }
  }
  return <section className="space-y-3 rounded-3xl bg-cream p-5"><h2 className="font-bold">แจ้งเตือนเมื่อปิดหน้าเว็บ</h2><p className="text-sm text-ink-soft">{prefix === "/merchant" ? "เจ้าของร้านรับออเดอร์ใหม่ การยกเลิกโดยลูกค้า และการรับอาหารบนอุปกรณ์นี้" : "รับสถานะออเดอร์บนอุปกรณ์นี้"} ต้องอนุญาตแจ้งเตือนก่อน</p><button type="button" disabled={!supported || busy || !userId} onClick={() => apply(enabled ? "disable" : "enable")} className="rounded-full bg-cocoa px-4 py-2 text-white disabled:opacity-50">{busy ? "กำลังตั้งค่า…" : enabled ? "ปิดแจ้งเตือนอุปกรณ์นี้" : "เปิดแจ้งเตือนอุปกรณ์นี้"}</button>{!supported && !platform.needsInstall && !platform.oldIOS && <p className="text-sm">เบราว์เซอร์หรือโหมดนี้ยังไม่รองรับ Web Push ลองเปิด Safari/Chrome รุ่นปัจจุบันตามขั้นตอนด้านล่าง หรือเลือกอีเมล</p>}{status.message && <p role={status.retry ? "alert" : "status"} className="text-sm">{status.message}</p>}{status.retry && <button type="button" disabled={busy} className="text-sm underline disabled:opacity-50" onClick={() => apply(status.retry)}>ลองอีกครั้ง</button>}<MobilePushGuide platform={platform} /></section>;
}
