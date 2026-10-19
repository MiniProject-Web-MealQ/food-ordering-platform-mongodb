import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { patchJson, postJson } from "@/lib/api-client";
import { PageHeader } from "@/features/customer/components/page-header";
import { buttonClasses, focusRing } from "@/components/ui/styles";
import { pageClass } from "@/features/merchant/styles";
import { inventoryGuide, unitNeedsReview } from "@/features/merchant/inventory-state";
import { useInventoryCatalogue } from "@/features/merchant/use-inventory-catalogue";
import { useMerchant } from "@/features/merchant/store";
import { usePageTitle } from "@/lib/use-page-title";

const inputClass = `min-w-0 rounded-xl border border-haze bg-white px-3 py-3 text-base ${focusRing}`;
const emptyValues = () => ({ name: "", unit: "", quantity: "0", lowStockThreshold: "0" });
const editPath = (menuId) => `/merchant/menu?edit=${encodeURIComponent(menuId)}`;

function StockRow({ row, onSaved }) {
  const [amount, setAmount] = useState("");
  const [threshold, setThreshold] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function save(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await patchJson(`/merchant/inventory/${row.id}`, { adjustment: Number(amount || 0), lowStockThreshold: Number(threshold ?? row.lowStockThreshold) });
      if (!mounted.current) return;
      if (!result.ok) { setError(result.error?.message || "บันทึกไม่สำเร็จ"); return; }
      const refreshed = await onSaved();
      if (!mounted.current) return;
      setAmount(""); setThreshold(null);
      setMessage(refreshed ? "บันทึกการปรับสต็อกแล้ว" : "บันทึกแล้ว แต่ยังโหลดจำนวนล่าสุดไม่ได้ กรุณากดอัปเดตข้อมูล");
    } catch {
      if (mounted.current) setError("เชื่อมต่อไม่สำเร็จ ยังยืนยันการบันทึกไม่ได้ กรุณาลองอีกครั้ง");
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <li className="space-y-4 rounded-3xl border border-haze bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-lg font-bold text-ink">{row.name}</h3><p className="mt-1 text-sm text-ink-soft">หน่วยที่ใช้ในสูตร: {row.unit}</p></div><p className={row.lowStock ? "font-bold text-danger" : "font-bold text-ink"}>{row.quantity.toLocaleString("th-TH", { maximumFractionDigits: 6 })} {row.unit}{row.lowStock ? " · ใกล้หมด" : ""}</p></div>
    {row.unitNeedsReview && <p className="rounded-2xl bg-cream p-3 text-sm leading-relaxed text-ink">หน่วย “{row.unit}” เป็นตัวเลข โปรดตรวจสอบว่าต้องการใช้หน่วยใด เช่น กรัม ชิ้น หรือฟอง ส่วนปริมาณที่ใช้ต่อจานกำหนดแยกในสูตรเมนู</p>}
    <div className="rounded-2xl bg-cream p-4"><h4 className="text-sm font-semibold text-ink">เมนูที่ใช้วัตถุดิบนี้</h4>{row.linkedMenus.length ? <ul className="mt-2 space-y-2">{row.linkedMenus.map((menu) => <li key={menu.menuId} className="flex flex-wrap items-center justify-between gap-2 text-sm"><Link to={editPath(menu.menuId)} className={`break-words underline underline-offset-4 ${focusRing}`}>{menu.name}</Link><span className="text-ink-soft">{menu.quantity} {menu.unit} ต่อ 1 จาน</span></li>)}</ul> : <p className="mt-2 text-sm leading-relaxed text-ink-soft">ยังไม่มีเมนูผูกวัตถุดิบนี้ การสั่งอาหารจึงยังไม่ตัดรายการนี้ ให้เปิดแก้ไขเมนูแล้วกำหนดสูตรก่อน</p>}</div>
    <form onSubmit={save} aria-busy={busy} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><label className="grid min-w-0 gap-1 text-sm">ปรับจำนวน (+ เติม / − ลด)<input disabled={busy} type="number" step="any" min={-row.quantity} max="1000000" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} /></label><label className="grid min-w-0 gap-1 text-sm">แจ้งเตือนเมื่อเหลือไม่เกิน<input disabled={busy} type="number" min="0" max="1000000" step="any" required value={threshold ?? String(row.lowStockThreshold)} onChange={(event) => setThreshold(event.target.value)} className={inputClass} /></label><button type="submit" disabled={busy} className={buttonClasses({ variant: "cocoa", size: "md" })}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button></form>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}{message && <p role="status" className="text-sm text-ink-soft">{message}</p>}
  </li>;
}

export default function Inventory() {
  usePageTitle("สต็อกวัตถุดิบ");
  const { state } = useMerchant();
  const catalogue = useInventoryCatalogue({ includeMenus: true, watchKey: state.orders, pollMs: 15000 });
  const guide = inventoryGuide(catalogue.ingredients, catalogue.menus);
  const [values, setValues] = useState(emptyValues);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function create(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setFormError("");
    try {
      const result = await postJson("/merchant/inventory", { name: values.name.trim(), unit: values.unit.trim(), quantity: Number(values.quantity), lowStockThreshold: Number(values.lowStockThreshold) });
      if (!mounted.current) return;
      if (!result.ok) { setFormError(result.error?.message || "เพิ่มวัตถุดิบไม่สำเร็จ"); return; }
      setValues(emptyValues());
      await catalogue.refresh();
    } catch {
      if (mounted.current) setFormError("เชื่อมต่อไม่สำเร็จ ยังยืนยันการเพิ่มวัตถุดิบไม่ได้ กรุณาลองอีกครั้ง");
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return <div className={`${pageClass} space-y-5`}>
    <PageHeader title="สต็อกวัตถุดิบ" subtitle="กำหนดหน่วยและสูตรต่อจาน เพื่อให้ตัดสต็อกตามการสั่งซื้อ" action={<button type="button" disabled={catalogue.refreshing} onClick={catalogue.refresh} className={buttonClasses({ variant: "cocoa-outline", size: "md" })}>{catalogue.refreshing ? "กำลังอัปเดต…" : "อัปเดตข้อมูล"}</button>} />
    <section className="space-y-2 rounded-3xl bg-cream p-5 text-sm leading-relaxed text-ink"><h2 className="font-bold">สต็อกจะลดเมื่อเมนูมีสูตรวัตถุดิบ</h2><p>ระบบตัดวัตถุดิบตามปริมาณต่อจานเมื่อสั่งซื้อสำเร็จ และคืนเมื่อยกเลิก การเพิ่มวัตถุดิบอย่างเดียวยังไม่ผูกกับเมนู</p><p>สูตรที่เพิ่มหรือแก้ไขมีผลกับออเดอร์ใหม่หลังบันทึกเท่านั้น ออเดอร์เดิมจะไม่ถูกหักสต็อกย้อนหลัง</p></section>
    <p role="status" className="text-sm text-ink-soft">{catalogue.updatedAt ? `โหลดข้อมูลสำเร็จล่าสุด ${new Date(catalogue.updatedAt).toLocaleTimeString("th-TH")} · อัปเดตตามออเดอร์และทุก 15 วินาที` : "กำลังโหลดข้อมูลสต็อกและสูตรเมนู…"}</p>
    {catalogue.error && <p role="alert" className="rounded-2xl bg-alert/10 p-4 text-sm text-danger">{catalogue.error} {catalogue.updatedAt ? "กำลังแสดงข้อมูลจากการโหลดครั้งล่าสุด" : ""} <button type="button" disabled={catalogue.refreshing} onClick={catalogue.refresh} className="underline">ลองอีกครั้ง</button></p>}
    {!catalogue.loading && guide.menusWithoutRecipes.length > 0 && <section className="rounded-3xl border border-alert/40 bg-cream p-5"><h2 className="font-bold text-ink">ยังมี {guide.menusWithoutRecipes.length} เมนูที่ไม่ผูกสูตร</h2><p className="mt-2 text-sm leading-relaxed text-ink-soft">เมนูเหล่านี้ยังรับออเดอร์ใหม่ไม่ได้ ให้กำหนดส่วนผสมและปริมาณต่อจานแล้วบันทึกเมนูก่อน สูตรที่เพิ่มจะไม่ตัดสต็อกออเดอร์เดิมย้อนหลัง</p><ul className="mt-3 space-y-2">{guide.menusWithoutRecipes.map((menu) => <li key={menu.id}><Link to={editPath(menu.id)} className={`inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 ${focusRing}`}>กำหนดสูตร {menu.name} →</Link></li>)}</ul></section>}
    <form onSubmit={create} aria-busy={busy} className="grid gap-4 rounded-3xl bg-cream p-5 sm:grid-cols-2"><h2 className="font-bold sm:col-span-2">เพิ่มวัตถุดิบ</h2>{[["name", "ชื่อวัตถุดิบ"], ["unit", "ชื่อหน่วย เช่น กรัม / ชิ้น / ฟอง"], ["quantity", "จำนวนเริ่มต้น"], ["lowStockThreshold", "แจ้งเตือนเมื่อเหลือไม่เกิน"]].map(([key, label]) => <label key={key} className="grid min-w-0 gap-2 text-sm">{label}<input disabled={busy} required type={key === "name" || key === "unit" ? "text" : "number"} min="0" max={key === "quantity" || key === "lowStockThreshold" ? "1000000" : undefined} maxLength={key === "name" ? 100 : key === "unit" ? 40 : undefined} step="any" value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className={inputClass} /></label>)}{unitNeedsReview(values.unit) && <p className="text-sm leading-relaxed text-ink sm:col-span-2">ชื่อหน่วยเป็นตัวเลข โปรดตรวจสอบหน่วยก่อนบันทึก เช่น “กรัม” ส่วนจำนวน เช่น 100 ให้กรอกในช่องจำนวนหรือปริมาณต่อจาน</p>}<button type="submit" disabled={busy} className={`${buttonClasses({ variant: "cocoa", size: "md" })} sm:col-span-2`}>{busy ? "กำลังเพิ่ม…" : "เพิ่มวัตถุดิบ"}</button>{formError && <p role="alert" className="text-sm text-danger sm:col-span-2">{formError}</p>}</form>
    {catalogue.loading ? <p role="status">กำลังโหลดสต็อก…</p> : <ul className="space-y-4">{guide.ingredients.map((row) => <StockRow key={row.id} row={row} onSaved={catalogue.refresh} />)}{!guide.ingredients.length && <li className="rounded-3xl border border-haze p-5 text-sm text-ink-soft">ยังไม่มีวัตถุดิบ เพิ่มรายการด้านบน แล้วกำหนดสูตรในหน้าเมนู</li>}</ul>}
  </div>;
}
