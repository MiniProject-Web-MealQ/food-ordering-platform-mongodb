import { useEffect } from "react";
import { Link } from "react-router";
import { focusRing } from "@/components/ui/styles";
import { recipeAvailability, unitNeedsReview, validateRecipeRows } from "../inventory-state";
import { useInventoryCatalogue } from "../use-inventory-catalogue";

export function RecipeEditor({ rows, onChange, onValidityChange }) {
  const { ingredients, error, loading, refreshing, refresh } = useInventoryCatalogue();
  const problems = loading ? [] : recipeAvailability(rows, ingredients);
  const message = loading || refreshing ? "กำลังตรวจสอบวัตถุดิบล่าสุด…"
    : error ? "ยังตรวจสอบวัตถุดิบไม่ได้ กรุณาอัปเดตข้อมูลก่อนบันทึก"
    : problems.length ? "ตรวจสอบวัตถุดิบที่ไม่พร้อมใช้หรือหน่วยไม่ตรงกันในสูตร"
    : validateRecipeRows(rows);
  const valid = !message;
  useEffect(() => { onValidityChange?.({ valid, loading: loading || refreshing, message }); }, [onValidityChange, valid, loading, refreshing, message]);
  const update = (index, change) => onChange(rows.map((row, at) => at === index ? { ...row, ...change } : row));
  return <section id="menu-recipe" tabIndex={-1} className="space-y-3 rounded-3xl bg-cream p-5">
    <h2 className="font-bold">สูตรวัตถุดิบต่อ 1 จาน <span className="text-sm font-normal">(จำเป็น)</span></h2>
    <p className="text-sm leading-relaxed text-ink-soft">เลือกส่วนผสมอย่างน้อย 1 รายการ พร้อมปริมาณต่อจานก่อนเพิ่มหรือบันทึกเมนู ระบบตัดตามสูตรเมื่อสั่งซื้อสำเร็จ และคืนเมื่อยกเลิก</p>
    <p className="text-sm leading-relaxed text-ink-soft">สูตรที่แก้ไขมีผลกับออเดอร์ใหม่หลังบันทึกเท่านั้น ไม่ตัดสต็อกออเดอร์เดิมย้อนหลัง</p>
    <div className="flex flex-wrap items-center gap-3"><Link className={`inline-flex min-h-11 items-center text-sm underline ${focusRing}`} to="/merchant/inventory" target="_blank" rel="noreferrer">เพิ่ม / จัดการวัตถุดิบ (หน้าต่างใหม่)</Link><button type="button" disabled={refreshing} onClick={refresh} className={`min-h-11 text-sm underline ${focusRing}`}>{refreshing ? "กำลังอัปเดต…" : "อัปเดตวัตถุดิบ"}</button></div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {!loading && !ingredients.length && !error && <p className="text-sm leading-relaxed text-ink-soft">ยังไม่มีวัตถุดิบ ให้เพิ่มในหน้าจัดการ แล้วกลับมากดอัปเดตวัตถุดิบ สูตรที่กำลังกรอกจะยังอยู่</p>}
    {rows.map((row, index) => {
      const ingredient = ingredients.find((item) => item.id === row.ingredient_id);
      const problem = problems.find((item) => item.index === index);
      return <div key={index} className="space-y-2 rounded-2xl border border-haze p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label={`วัตถุดิบที่ ${index + 1}`} aria-invalid={Boolean(problem) || undefined} required value={row.ingredient_id} className={`min-w-0 flex-[1_1_12rem] rounded-xl border border-haze bg-white p-3 text-base ${focusRing}`} onChange={(event) => {
            if (!event.target.value) { update(index, { ingredient_id: "", unit: "" }); return; }
            const selected = ingredients.find((item) => item.id === event.target.value && item.isActive !== false);
            if (selected) update(index, { ingredient_id: selected.id, unit: selected.unit });
          }}>
            <option value="">เลือกวัตถุดิบ</option>
            {row.ingredient_id && !ingredient && <option value={row.ingredient_id} disabled>วัตถุดิบเดิมไม่พร้อมใช้ กรุณาเลือกใหม่</option>}
            {ingredients.map((item) => <option key={item.id} value={item.id} disabled={item.isActive === false || rows.some((other, at) => at !== index && other.ingredient_id === item.id)}>{item.name} ({item.unit}){item.isActive === false ? " · ปิดใช้งาน" : ""}</option>)}
          </select>
          <label className="grid gap-1 text-sm">ปริมาณต่อจาน<input aria-label={`ปริมาณต่อจานที่ ${index + 1}`} type="number" required min="0.000001" max="1000000" step="any" value={row.quantity} onChange={(event) => update(index, { quantity: event.target.value })} className={`w-28 rounded-xl border border-haze bg-white p-3 text-base ${focusRing}`} /></label>
          <span className="text-sm">{row.unit || "หน่วยตามวัตถุดิบ"}</span><button type="button" className={`min-h-11 px-2 text-sm text-danger underline ${focusRing}`} onClick={() => onChange(rows.filter((_, at) => at !== index))}>ลบ</button>
        </div>
        {problem && <p role="alert" className="text-sm leading-relaxed text-danger">{problem.reason === "unit" ? "หน่วยในสูตรไม่ตรงกับวัตถุดิบล่าสุด กรุณาใช้หน่วยล่าสุดแล้วตรวจปริมาณต่อจาน ระบบไม่แปลงหน่วยให้อัตโนมัติ" : "วัตถุดิบนี้ถูกลบหรือปิดใช้งาน กรุณาเลือกวัตถุดิบใหม่ก่อนบันทึก"}</p>}
        {problem?.reason === "unit" && ingredient && <button type="button" className={`min-h-11 text-sm font-semibold underline ${focusRing}`} onClick={() => update(index, { unit: ingredient.unit })}>ใช้หน่วยล่าสุด “{ingredient.unit}” แล้วตรวจปริมาณต่อจาน</button>}
        {unitNeedsReview(row.unit) && <p className="text-sm leading-relaxed text-ink-soft">หน่วย “{row.unit}” เป็นตัวเลข โปรดตรวจสอบชื่อหน่วยในหน้าจัดการวัตถุดิบ โดยปริมาณที่ใช้ต่อจานกรอกในช่องปริมาณ</p>}
      </div>;
    })}
    <button type="button" className={`min-h-11 text-sm font-semibold underline ${focusRing}`} onClick={() => onChange([...rows, { ingredient_id: "", quantity: "", unit: "" }])}>+ เพิ่มส่วนผสม</button>
    {!error && message && <p role="status" className="text-sm leading-relaxed text-ink-soft">{message}</p>}
  </section>;
}
