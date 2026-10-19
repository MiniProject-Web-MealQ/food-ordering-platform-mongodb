import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { cx } from "@/lib/cx";
import { notificationPresentation, notificationTime } from "./notification-details";

const TONES = { brand: "bg-brand/20 text-brand-ink", mint: "bg-mint text-ink", danger: "bg-alert/15 text-danger", cream: "bg-haze text-ink" };

export function NotificationAccordion({ notification, onRead, audience = "customer", order = null, storeName = "" }) {
  const uniqueId = useId();
  const panelId = `notification-details-${uniqueId}`;
  const triggerId = `notification-trigger-${uniqueId}`;
  const [open, setOpen] = useState(false);
  const [readState, setReadState] = useState({ busy: false, error: "" });
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const presentation = notificationPresentation(notification, { audience, order, storeName });

  async function acknowledge() {
    if (notification.read || pending.current) return;
    pending.current = true; setReadState({ busy: true, error: "" });
    try {
      const result = await onRead(notification.id);
      if (!active.current) return;
      if (result?.ok !== true) setReadState({ busy: false, error: result?.error?.message || "บันทึกการอ่านไม่สำเร็จ กรุณาลองอีกครั้ง" });
      else setReadState({ busy: false, error: "" });
    } catch (error) {
      if (active.current) setReadState({ busy: false, error: error.message || "บันทึกการอ่านไม่สำเร็จ กรุณาลองอีกครั้ง" });
    } finally { pending.current = false; }
  }
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) acknowledge();
  }

  return <li className={cx("overflow-hidden rounded-3xl border border-transparent", !notification.read ? "bg-cream ring-1 ring-mint" : "bg-cream/70", open && "border-haze bg-cream")}>
    <button id={triggerId} type="button" aria-expanded={open} aria-controls={panelId} onClick={toggle} className={cx("flex w-full items-start gap-3 rounded-3xl p-4 text-left hover:bg-haze/40", focusRing, "focus-visible:-outline-offset-2")}>
      <span aria-hidden="true" className={cx("grid size-10 shrink-0 place-items-center rounded-2xl text-lg", TONES[presentation.tone])}>{presentation.icon}</span>
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="font-bold text-ink wrap-anywhere">{notification.title || "การแจ้งเตือน MealQ"}</span>{!notification.read && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-ink">ยังไม่อ่าน</span>}</span><span className="mt-1 block line-clamp-2 text-sm text-ink-soft wrap-anywhere">{notification.body}</span><span className="mt-2 block text-xs text-ink-soft">{notificationTime(notification.at)} · {open ? "กดเพื่อย่อรายละเอียด" : "กดเพื่อดูรายละเอียด"}</span></span>
      <ChevronDown aria-hidden="true" size={18} className={cx("mt-1 shrink-0 text-ink-soft transition-transform motion-reduce:transition-none", open && "rotate-180")} />
    </button>
    <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!open} className="border-t border-haze px-4 py-4 sm:px-5">
      <p className="text-sm leading-relaxed whitespace-pre-line text-ink wrap-anywhere">{notification.body || notification.title}</p>
      {presentation.description && presentation.description !== notification.body && <p className="mt-2 text-sm leading-relaxed text-ink-soft wrap-anywhere">{presentation.description}</p>}
      <dl className="mt-4 grid gap-2 rounded-2xl bg-white/60 p-3 text-sm">{presentation.rows.map((row) => <div key={row.label} className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt className="text-ink-soft">{row.label}</dt><dd className="min-w-0 font-semibold text-ink wrap-anywhere">{row.value}</dd></div>)}</dl>
      {readState.busy && <p role="status" className="mt-3 text-xs text-ink-soft">กำลังบันทึกว่าอ่านแล้ว…</p>}
      {readState.error && <div role="alert" className="mt-3 rounded-2xl bg-alert/10 p-3 text-sm text-danger"><p>{readState.error}</p><button type="button" disabled={readState.busy} className={cx("mt-2 rounded-lg font-semibold underline", focusRing)} onClick={acknowledge}>ลองบันทึกการอ่านอีกครั้ง</button></div>}
      {presentation.action && <Link to={presentation.action.to} className={cx(buttonClasses({ variant: "cocoa", size: "sm" }), "mt-4 w-full sm:w-auto")}><span>{presentation.action.label}</span><ArrowUpRight aria-hidden="true" size={15} /></Link>}
    </div>
  </li>;
}
