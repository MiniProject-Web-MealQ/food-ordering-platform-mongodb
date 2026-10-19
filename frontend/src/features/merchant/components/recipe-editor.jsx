import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getJson } from "@/lib/api-client";
export function RecipeEditor({ rows, onChange }) {
  const [ingredients, setIngredients] = useState([]); const [error, setError] = useState("");
  useEffect(() => { let active = true; getJson("/merchant/inventory").then((result) => { if (!active) return; if (result.ok) setIngredients(result.data.ingredients); else setError(result.error?.message || "โหลดวัตถุดิบไม่สำเร็จ"); }); return () => { active = false; }; }, []);
  const update = (index, change) => onChange(rows.map((row, at) => at === index ? { ...row, ...change } : row));
  return <section className="space-y-3 rounded-3xl bg-cream p-5"><h2 className="font-bold">สูตรวัตถุดิบต่อ 1 จาน</h2><p className="text-sm text-ink-soft">ตัดสต็อกเมื่อสั่งซื้อ และคืนเมื่อยกเลิก เมนูที่ไม่กำหนดสูตรจะไม่ตัดสต็อก</p><Link className="text-sm underline" to="/merchant/inventory" target="_blank" rel="noreferrer">จัดการวัตถุดิบ (เปิดหน้าต่างใหม่)</Link>{error && <p role="alert">{error}</p>}
    {rows.map((row, index) => <div key={row.ingredient_id || index} className="flex flex-wrap items-center gap-2">
      <select aria-label={`วัตถุดิบที่ ${index + 1}`} required value={row.ingredient_id} className="min-w-0 flex-1 rounded-xl border border-haze bg-white p-3" onChange={(event) => { const ingredient = ingredients.find((item) => item.id === event.target.value); update(index, { ingredient_id: ingredient.id, unit: ingredient.unit }); }}><option value="" disabled>เลือกวัตถุดิบ</option>{ingredients.map((item) => <option key={item.id} value={item.id} disabled={rows.some((other, at) => at !== index && other.ingredient_id === item.id)}>{item.name} ({item.unit})</option>)}</select>
      <input aria-label={`ปริมาณต่อจานที่ ${index + 1}`} type="number" required min="0.000001" max="1000000" step="any" value={row.quantity} onChange={(event) => update(index, { quantity: event.target.value })} className="w-24 rounded-xl border border-haze bg-white p-3" /><span className="text-sm">{row.unit}</span><button type="button" className="text-danger underline" onClick={() => onChange(rows.filter((_, at) => at !== index))}>ลบ</button>
    </div>)}<button type="button" className="underline" onClick={() => onChange([...rows, { ingredient_id: "", quantity: "", unit: "" }])}>+ เพิ่มวัตถุดิบ</button>
  </section>;
}
