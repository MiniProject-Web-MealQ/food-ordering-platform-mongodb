import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { TicketIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/styles";
import { COUPONS } from "@/features/customer/catalog";
import { CouponDetails } from "@/features/customer/components/coupon-details";
import { PageHeader } from "@/features/customer/components/page-header";
import { couponEligibility, couponLabel } from "@/features/customer/coupons";
import { useCustomer } from "@/features/customer/store";
import { containerClass } from "@/features/customer/styles";
import { usePageTitle } from "@/lib/use-page-title";

export default function Coupons() {
  usePageTitle("คูปองของฉัน");
  const { state, collectCoupon, couponsLoading, couponsError, refreshCoupons, refresh } = useCustomer();
  const [params] = useSearchParams();
  const highlightId = params.get("promotionId");
  const [view, setView] = useState(highlightId ? "discover" : "saved");
  const [pending, setPending] = useState([]);
  const [messages, setMessages] = useState({});
  const publicCoupons = Object.values(COUPONS);
  const list = view === "saved" ? state.coupons : publicCoupons;
  const highlightedExists = [...state.coupons, ...publicCoupons].some((coupon) => coupon.id === highlightId);

  async function handleCollect(id) {
    if (pending.includes(id)) return;
    setPending((ids) => [...ids, id]);
    setMessages((current) => ({ ...current, [id]: null }));
    const result = await collectCoupon(id);
    setMessages((current) => ({ ...current, [id]: { ok: result.ok, text: result.ok ? "เก็บคูปองในบัญชีแล้ว เลือกใช้ตอนชำระเงินได้" : result.error?.message || "เก็บคูปองไม่สำเร็จ กรุณาลองใหม่" } }));
    setPending((ids) => ids.filter((candidate) => candidate !== id));
    if (!result.ok) refresh();
  }

  return <main className={`${containerClass} flex-1 space-y-5 pb-8 lg:pb-16`}>
    <PageHeader title="คูปองของฉัน" fallback="/customer/profile" />
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-cream p-5 lg:p-6">
      <div><p className="font-bold text-ink">เก็บก่อน แล้วเลือกใช้ได้ 1 คูปองต่อออเดอร์</p><p className="mt-1 text-sm text-ink-soft">คูปองผูกกับบัญชีของคุณ และจะตรวจสอบสิทธิ์อีกครั้งตอนชำระเงิน</p></div>
      <Link to={state.cart.items.length ? "/customer/checkout#checkout-coupons" : "/customer/explore"} className={buttonClasses({ variant: "cocoa", size: "sm" })}>{state.cart.items.length ? "กลับไปเลือกคูปองและชำระเงิน" : "เลือกอาหาร"}</Link>
    </section>
    <div className="flex flex-wrap items-center gap-2" aria-label="รายการคูปอง">
      {[{ id: "saved", label: `เก็บไว้แล้ว (${state.coupons.length})` }, { id: "discover", label: "คูปองให้เก็บ" }].map((tab) => <button key={tab.id} type="button" aria-pressed={view === tab.id} onClick={() => setView(tab.id)} className={buttonClasses({ variant: view === tab.id ? "cocoa" : "cocoa-outline", size: "sm" })}>{tab.label}</button>)}
      <button type="button" disabled={couponsLoading} onClick={() => { refreshCoupons(); refresh(); }} className="ml-auto rounded-full px-4 py-2 text-sm font-semibold text-ink underline disabled:opacity-50">{couponsLoading ? "กำลังโหลด…" : "อัปเดตคูปอง"}</button>
    </div>
    {couponsError && <p role="alert" className="rounded-2xl bg-alert/10 p-4 text-sm text-danger">{couponsError} <button type="button" onClick={refreshCoupons} className="font-semibold underline">ลองอีกครั้ง</button></p>}
    {couponsLoading && view === "saved" && <p role="status" className="text-sm text-ink-soft">กำลังโหลดคูปองจากบัญชี…</p>}
    {highlightId && !highlightedExists && !couponsLoading && <p role="status" className="rounded-2xl bg-cream p-4 text-sm text-ink-soft">คูปองจากการแจ้งเตือนนี้ไม่เปิดให้เก็บแล้ว อาจหมดอายุหรือถูกปิดใช้งาน</p>}
    {!list.length && !couponsLoading && !couponsError && <div className="rounded-3xl bg-cream px-5 py-10 text-center"><TicketIcon className="mx-auto size-10 text-cocoa" /><p className="mt-3 font-bold text-ink">{view === "saved" ? "ยังไม่มีคูปองที่เก็บไว้" : "ยังไม่มีคูปองให้เก็บในตอนนี้"}</p>{view === "saved" && <button type="button" onClick={() => setView("discover")} className="mt-3 font-semibold text-cocoa underline">ดูคูปองให้เก็บ</button>}</div>}
    <div className="grid gap-4 md:grid-cols-2">
      {list.map((coupon) => {
        const saved = state.coupons.find((entry) => entry.id === coupon.id);
        const availability = couponEligibility(coupon, { requireSaved: view === "saved", forCollection: view === "discover" });
        const isPending = pending.includes(coupon.id);
        const message = messages[coupon.id];
        return <article key={coupon.id} className={`flex flex-col gap-4 rounded-3xl border bg-cream p-5 ${highlightId === coupon.id ? "border-cocoa ring-2 ring-apricot" : "border-haze"}`}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-xl font-bold text-cocoa">{couponLabel(coupon)}</p><h2 className="mt-1 font-bold text-ink">{coupon.title || coupon.code}</h2></div><span className="shrink-0 rounded-xl border border-dashed border-cocoa/30 bg-white px-3 py-2 text-sm font-bold tracking-wide text-cocoa">{coupon.code}</span></div>
          {coupon.description && <p className="text-sm text-ink-soft">{coupon.description}</p>}
          <CouponDetails coupon={coupon} />
          {!availability.eligible && <p className="text-sm font-semibold text-danger">{availability.reason}</p>}
          {view === "saved" ? <p className="mt-auto text-sm font-semibold text-brand-ink">{availability.eligible ? "เก็บแล้ว · เลือกใช้ได้ที่หน้าชำระเงินตามเงื่อนไข" : "เก็บไว้ในบัญชี · ยังใช้ไม่ได้"}</p> : <button type="button" disabled={Boolean(saved) || isPending || !availability.eligible || couponsLoading || Boolean(couponsError)} onClick={() => handleCollect(coupon.id)} className={`${buttonClasses({ variant: saved ? "cocoa-outline" : "cocoa", size: "md", fullWidth: true })} mt-auto`}>{isPending ? "กำลังเก็บ…" : saved ? "เก็บไว้แล้ว" : "เก็บคูปอง"}</button>}
          {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-brand-ink" : "text-danger"}`}>{message.text}</p>}
        </article>;
      })}
    </div>
  </main>;
}
