import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { fieldClass, panelClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { toPromotionFields, validatePromotion } from "../promotion-form";

const FIELD_ORDER = ["code", "title", "discount_value", "max_discount", "minimum_order", "start_date", "expire_date", "usage_limit", "per_user_limit"];
const idOf = (field) => `promo-${field.replace("_", "-")}`;

function Unit({ children }) {
  return <span className="pr-4 text-sm font-medium text-ink-soft">{children}</span>;
}

function DateInput({ field, label, values, error, onChange }) {
  return (
    <div className="space-y-2">
      <label htmlFor={idOf(field)} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={idOf(field)}
        type="date"
        value={values[field]}
        onChange={(e) => onChange(field, e.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${idOf(field)}-error` : undefined}
        className={cx(fieldClass, "h-14 rounded-full px-6")}
      />
      {error && (
        <p id={`${idOf(field)}-error`} className="px-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** ฟอร์มสร้าง/แก้ไขคูปอง ใช้ใน pop-up ของหน้าคูปอง `onSubmit` ได้รับ field ตาม Promotion model */
export function PromotionForm({ initialValues, promotions, stores, editingId = null, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const errors = validatePromotion(values, promotions, editingId);
  const shown = submitted ? errors : {};
  const errorCount = Object.keys(errors).length;
  const percentage = values.discount_type === "percentage";

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function text(field, transform = (v) => v) {
    return {
      id: idOf(field),
      value: values[field],
      error: shown[field],
      onChange: (e) => set(field, transform(e.target.value)),
    };
  }

  const digits = (v) => v.replace(/\D/g, "");

  function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (errorCount) {
      const first = FIELD_ORDER.find((f) => errors[f]);
      document.getElementById(idOf(first))?.focus();
      return;
    }
    onSubmit(toPromotionFields(values));
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
      <div className={cx(panelClass, "space-y-5")}>
        {submitted && errorCount > 0 && <Alert tone="error" title={`ยังบันทึกไม่ได้ มี ${errorCount} ช่องที่ต้องแก้`} />}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="โค้ดคูปอง" placeholder="เช่น LUNCH10" autoComplete="off" {...text("code", (v) => v.toUpperCase().replace(/\s/g, ""))} />
          <TextField label="ชื่อคูปอง" placeholder="เช่น ลด 10% ช่วงกลางวัน" {...text("title")} />
        </div>
        <TextField label="คำอธิบาย (ไม่บังคับ)" {...text("description")} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-ink">ประเภทส่วนลด</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: "percentage", label: "ลดเป็นเปอร์เซ็นต์ (%)" },
              { value: "fixed", label: "ลดเป็นจำนวนเงิน (บาท)" },
            ].map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-ink has-checked:ring-2 has-checked:ring-brand">
                <input
                  type="radio"
                  name="discount-type"
                  value={o.value}
                  checked={values.discount_type === o.value}
                  onChange={() => set("discount_type", o.value)}
                  className="size-4 accent-cocoa"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="ส่วนลด" inputMode="numeric" trailing={<Unit>{percentage ? "%" : "บาท"}</Unit>} {...text("discount_value", digits)} />
          {percentage ? (
            <TextField label="ลดสูงสุดไม่เกิน (ไม่บังคับ)" inputMode="numeric" trailing={<Unit>บาท</Unit>} {...text("max_discount", digits)} />
          ) : (
            <div aria-hidden="true" className="max-sm:hidden" />
          )}
          <TextField label="ยอดสั่งขั้นต่ำ" inputMode="numeric" trailing={<Unit>บาท</Unit>} hint="0 = ไม่มีขั้นต่ำ" {...text("minimum_order", digits)} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <DateInput field="start_date" label="วันเริ่มใช้" values={values} error={shown.start_date} onChange={set} />
          <DateInput field="expire_date" label="วันหมดอายุ" values={values} error={shown.expire_date} onChange={set} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="จำนวนสิทธิ์ทั้งหมด (ไม่บังคับ)" inputMode="numeric" hint="เว้นว่าง = ไม่จำกัด" trailing={<Unit>ครั้ง</Unit>} {...text("usage_limit", digits)} />
          <TextField label="ใช้ได้ต่อคน" inputMode="numeric" trailing={<Unit>ครั้ง</Unit>} {...text("per_user_limit", digits)} />
        </div>

        <div className="space-y-2">
          <label htmlFor="promo-store" className="block text-sm font-semibold text-ink">
            ใช้กับร้าน
          </label>
          <select id="promo-store" value={values.store_id} onChange={(e) => set("store_id", e.target.value)} className={cx(fieldClass, "h-14 rounded-full px-6")}>
            <option value="">ทุกร้าน</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                เฉพาะ {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6">
        <div className={panelClass}>
          <ToggleSwitch id="promo-active" label="เปิดใช้งาน" checked={values.is_active} onChange={(v) => set("is_active", v)} />
          <p className="mt-1 text-xs text-ink-soft">ปิดไว้ก่อนได้ ลูกค้าจะใช้โค้ดนี้ไม่ได้จนกว่าจะเปิด</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="submit" variant="cocoa" fullWidth>
            {submitLabel}
          </Button>
          <Button variant="cocoa-outline" fullWidth onClick={onCancel}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </form>
  );
}
