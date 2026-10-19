import { useEffect, useRef, useState } from "react";
import { getJson, patchJson } from "@/lib/api-client";
import { useMerchant } from "../store";
import { NotificationAccordion } from "@/features/notifications/notification-accordion";
import { createNotificationReader } from "@/features/notifications/notification-details";

function MerchantNotificationInbox({ userId }) {
  const { state: merchant } = useMerchant();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [readingCount, setReadingCount] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const activeOwner = useRef(true);
  const acknowledged = useRef(new Set());
  const latestRows = useRef([]);
  const reader = useRef(null);
  useEffect(() => { latestRows.current = rows; }, [rows]);
  useEffect(() => {
    activeOwner.current = true;
    reader.current = createNotificationReader({
      send: (id) => patchJson(`/merchant/notifications/${encodeURIComponent(id)}/read`, {}),
      isCurrent: () => activeOwner.current && Boolean(userId),
      onAcknowledged(id) {
        if (id === "all") latestRows.current.forEach((row) => acknowledged.current.add(row.id));
        else acknowledged.current.add(id);
        setRows((items) => items.map((item) => id === "all" || item.id === id ? { ...item, read: true } : item));
      },
    });
    return () => { activeOwner.current = false; reader.current = null; };
  }, [userId]);
  useEffect(() => {
    let active = true;
    async function refresh() {
      const result = await getJson("/merchant/notifications");
      if (!active) return;
      if (result.ok && Array.isArray(result.data?.notifications)) {
        const incoming = result.data.notifications.filter((notice) => notice && typeof notice === "object" && typeof notice.id === "string");
        setRows(incoming.map((row) => acknowledged.current.has(row.id) ? { ...row, read: true } : row)); setLoaded(true); setError("");
      }
      else setError(result.error?.message || "โหลดแจ้งเตือนร้านไม่สำเร็จ");
    }
    refresh(); const timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [userId, attempt]);
  async function markRead(id) {
    setReadingCount((count) => count + 1);
    try {
      return reader.current ? await reader.current.read(id) : { ok: false, stale: true };
    } finally { if (activeOwner.current) setReadingCount((count) => count - 1); }
  }
  async function readAll() {
    setReadError("");
    const result = await markRead("all");
    if (activeOwner.current && !result.ok && !result.stale) setReadError(result.error?.message || "บันทึกการอ่านทั้งหมดไม่สำเร็จ");
  }
  const unread = rows.filter((row) => !row.read).length;
  return <section id="merchant-notifications" className="scroll-mt-20 space-y-3 rounded-3xl bg-cream p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">แจ้งเตือนสำหรับเจ้าของร้าน {unread > 0 && <span className="text-sm font-normal">(ยังไม่อ่าน {unread})</span>}</h2>{unread > 0 && <button disabled={readingCount > 0} type="button" className="text-sm underline disabled:opacity-50" onClick={readAll}>{readingCount > 0 ? "กำลังบันทึก…" : "อ่านทั้งหมด"}</button>}</header>
    <p className="text-sm text-ink-soft">กดรายการเพื่อขยายเหตุการณ์ แล้วเลือกดูรายละเอียดออเดอร์</p>
    {error && <p role="alert" className="text-sm text-danger">{error} <button type="button" className="underline" onClick={() => setAttempt((value) => value + 1)}>ลองใหม่</button></p>}
    {!loaded && !error && <p role="status" className="text-sm">กำลังโหลดแจ้งเตือน…</p>}
    {loaded && rows.length === 0 && <p className="text-sm text-ink-soft">ยังไม่มีแจ้งเตือน ออเดอร์ใหม่ การยกเลิกโดยลูกค้า และการรับอาหารจะแสดงที่นี่</p>}
    {readError && <p role="alert" className="rounded-2xl bg-alert/10 p-3 text-sm text-danger">{readError} <button type="button" disabled={readingCount > 0} className="font-semibold underline" onClick={readAll}>ลองบันทึกอีกครั้ง</button></p>}
    <ul className="max-h-96 space-y-2 overflow-y-auto">
      {rows.slice(0, 30).map((row) => <NotificationAccordion key={row.id} notification={row} audience="merchant" onRead={markRead} order={merchant.orders.find((order) => order._id === row.orderId || order.order_number === row.orderId)} storeName={merchant.store?.name} />)}
    </ul>
    {rows.length > 30 && <p className="text-xs text-ink-soft">แสดง 30 รายการล่าสุดจาก {rows.length} รายการ</p>}
  </section>;
}

export function MerchantOrderNotifications({ userId }) {
  return <MerchantNotificationInbox key={userId || "signed-out"} userId={userId} />;
}
