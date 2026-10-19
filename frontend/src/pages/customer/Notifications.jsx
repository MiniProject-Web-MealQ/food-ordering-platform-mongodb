import { useEffect, useRef, useState } from "react";
import { textLinkClass } from "@/components/ui/styles";
import { useCustomer } from "@/features/customer/store";
import { usePageTitle } from "@/lib/use-page-title";
import { NotificationAccordion } from "@/features/notifications/notification-accordion";
import { notificationDate } from "@/features/notifications/notification-details";

function NotificationInbox({ state, readNotification }) {
  const [readAllState, setReadAllState] = useState({ busy: false, error: "" });
  const active = useRef(true);
  const readingAll = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const notifications = state.notifications.filter((notice) => notice && typeof notice === "object" && typeof notice.id === "string").toSorted((a, b) => (notificationDate(b.at)?.getTime() || 0) - (notificationDate(a.at)?.getTime() || 0));
  const unread = notifications.filter((n) => !n.read).length;

  async function readAll() {
    if (readingAll.current) return;
    readingAll.current = true; setReadAllState({ busy: true, error: "" });
    try {
      const result = await readNotification("all");
      if (active.current) setReadAllState({ busy: false, error: result?.ok ? "" : result?.error?.message || "บันทึกการอ่านทั้งหมดไม่สำเร็จ กรุณาลองอีกครั้ง" });
    } catch (error) {
      if (active.current) setReadAllState({ busy: false, error: error.message || "บันทึกการอ่านทั้งหมดไม่สำเร็จ" });
    } finally { readingAll.current = false; }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-6 pb-8 sm:px-6 lg:space-y-6 lg:px-8 lg:pt-10 lg:pb-16">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink lg:text-4xl">การแจ้งเตือน</h1>
        {unread > 0 && (
          <button
            type="button"
            disabled={readAllState.busy}
            onClick={readAll}
            className={`${textLinkClass} text-sm disabled:opacity-50`}
          >
            {readAllState.busy ? "กำลังบันทึก…" : "อ่านทั้งหมด"}
          </button>
        )}
      </header>
      <p className="text-sm text-ink-soft">กดที่รายการเพื่อขยายรายละเอียด แล้วเลือกเปิดออเดอร์หรือคูปองที่เกี่ยวข้อง</p>
      {readAllState.error && <div role="alert" className="rounded-2xl bg-alert/10 p-3 text-sm text-danger">{readAllState.error} <button type="button" disabled={readAllState.busy} onClick={readAll} className="font-semibold underline">ลองอีกครั้ง</button></div>}

      {notifications.length === 0 ? (
        <p className="rounded-3xl bg-cream p-6 text-center text-ink-soft">ยังไม่มีการแจ้งเตือน</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => <NotificationAccordion key={notification.id} notification={notification} onRead={readNotification} order={state.orders.find((order) => order.id === notification.orderId || order.backendOrderId === notification.orderId)} />)}
        </ul>
      )}
    </div>
  );
}

function Notifications() {
  usePageTitle("การแจ้งเตือน");
  const { state, readNotification } = useCustomer();
  return <NotificationInbox key={state.user?.id || "guest"} state={state} readNotification={readNotification} />;
}

export default Notifications;
