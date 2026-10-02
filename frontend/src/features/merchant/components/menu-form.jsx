import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { buttonClasses } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { cx } from "@/lib/cx";
import { MENU_LIMITS, readMenuImage, toMenuFields, validateMenu } from "../menu-form";
import { MENU_CATEGORIES } from "../constants";
import { fieldClass, panelClass } from "../styles";

/** ลำดับช่องกรอก ใช้ย้าย focus ไปช่องแรกที่ผิดตอนกดบันทึก */
const FIELD_IDS = { name: "menu-name", category: "menu-category", price: "menu-price", cook_time: "menu-cook-time", description: "menu-description" };

function Unit({ children }) {
  return <span className="pr-4 text-sm font-medium text-ink-soft">{children}</span>;
}

/**
 * ใช้ร่วมกันใน pop-up เพิ่มเมนูและแก้ไขเมนู `onSubmit` ได้รับ field ตาม Menu model (snake_case, แปลงตัวเลขแล้ว)
 * และคืนผลจาก API ถ้าบันทึกไม่สำเร็จจะแสดง error เหนือฟอร์ม
 */
export function MenuForm({ initialValues, menus, editingId = null, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const errors = validateMenu(values, menus, editingId);
  const errorCount = Object.keys(errors).length;
  // หมวดที่แอปนี้ไม่รู้จัก (ตั้งจากที่อื่น) ยังเลือกได้ ไม่เปลี่ยนให้เองแบบเงียบ ๆ
  const categoryOptions = MENU_CATEGORIES.some((c) => c.value === initialValues.category) || !initialValues.category
    ? MENU_CATEGORIES
    : [...MENU_CATEGORIES, { value: initialValues.category, label: initialValues.category }];

  function errorFor(field) {
    return submitted || touched[field] ? errors[field] : undefined;
  }

  function set(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function fieldProps(field) {
    return {
      id: FIELD_IDS[field],
      name: field,
      value: values[field],
      error: errorFor(field),
      onChange: (e) => set(field, e.target.value),
      onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    };
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImageError("");
    setImageLoading(true);
    try {
      set("image", await readMenuImage(file));
    } catch (error) {
      setImageError(error.message);
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    if (errorCount > 0) {
      const first = Object.keys(FIELD_IDS).find((field) => errors[field]);
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    setSaving(true);
    setSaveError("");
    const result = await onSubmit(toMenuFields(values));
    // ถ้าสำเร็จ pop-up จะปิดและฟอร์มนี้หายไป จึงอัปเดต state เฉพาะตอนล้มเหลว
    if (result && !result.ok) {
      setSaving(false);
      setSaveError(result.error.message);
    }
  }

  const descriptionError = errorFor("description");

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
      <div className={cx(panelClass, "space-y-5")}>
        {submitted && errorCount > 0 && (
          <Alert tone="error" title={`ยังบันทึกไม่ได้ มี ${errorCount} ช่องที่ต้องแก้`} />
        )}
        {saveError && <Alert tone="error" title="บันทึกไม่สำเร็จ">{saveError}</Alert>}

        <TextField label="ชื่อเมนู" placeholder="เช่น ข้าวกะเพราหมูกรอบ" required {...fieldProps("name")} />

        <div className="space-y-2">
          <label htmlFor={FIELD_IDS.category} className="block text-sm font-semibold text-ink">
            หมวดหมู่
          </label>
          <select
            id={FIELD_IDS.category}
            name="category"
            required
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, category: true }))}
            aria-invalid={Boolean(errorFor("category")) || undefined}
            aria-describedby={errorFor("category") ? "menu-category-error" : "menu-category-hint"}
            className={cx(fieldClass, "h-14 rounded-full px-6")}
          >
            <option value="" disabled>
              เลือกหมวดหมู่
            </option>
            {categoryOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {errorFor("category") ? (
            <p id="menu-category-error" className="px-1 text-sm font-medium text-danger">
              {errorFor("category")}
            </p>
          ) : (
            <p id="menu-category-hint" className="px-1 text-sm text-ink-soft">
              ลูกค้าใช้หมวดนี้กรองเมนูในแอป
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="ราคา"
            inputMode="numeric"
            placeholder="0"
            required
            trailing={<Unit>บาท</Unit>}
            {...fieldProps("price")}
          />
          <TextField
            label="เวลาทำโดยประมาณ"
            inputMode="numeric"
            placeholder="0"
            required
            hint="ใช้คำนวณเวลารอให้ลูกค้า"
            trailing={<Unit>นาที</Unit>}
            {...fieldProps("cook_time")}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={FIELD_IDS.description} className="text-sm font-semibold text-ink">
              คำอธิบาย <span className="font-normal text-ink-soft">(ไม่บังคับ)</span>
            </label>
            <span
              aria-hidden="true"
              className={cx("text-xs", values.description.length > MENU_LIMITS.descriptionMax ? "text-danger" : "text-ink-soft")}
            >
              {values.description.length}/{MENU_LIMITS.descriptionMax}
            </span>
          </div>
          <textarea
            id={FIELD_IDS.description}
            name="description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, description: true }))}
            rows={3}
            placeholder="วัตถุดิบ รสชาติ หรือสิ่งที่ลูกค้าควรรู้"
            aria-invalid={Boolean(descriptionError) || undefined}
            aria-describedby={descriptionError ? "menu-description-error" : undefined}
            className={cx(fieldClass, "resize-y")}
          />
          {descriptionError && (
            <p id="menu-description-error" className="px-1 text-sm font-medium text-danger">
              {descriptionError}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6">
        <section aria-labelledby="menu-image-title" className={cx(panelClass, "space-y-3")}>
          <h2 id="menu-image-title" className="text-sm font-semibold text-ink">
            รูปเมนู <span className="font-normal text-ink-soft">(ไม่บังคับ)</span>
          </h2>
          {values.image ? (
            <img src={values.image} alt="รูปเมนูที่เลือก" className="aspect-[4/3] w-full rounded-2xl object-cover max-lg:max-w-64" />
          ) : (
            <ImagePlaceholder label="ยังไม่มีรูป" className="aspect-[4/3] w-full rounded-2xl max-lg:max-w-64" />
          )}
          <div className="flex flex-wrap gap-2">
            <label
              className={cx(
                buttonClasses({ variant: "cocoa-outline", size: "sm" }),
                "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
              )}
            >
              <ImagePlus aria-hidden="true" className="size-4" />
              {imageLoading ? "กำลังโหลดรูป…" : values.image ? "เปลี่ยนรูป" : "เลือกรูป"}
              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                aria-describedby={imageError ? "menu-image-error" : "menu-image-hint"}
                className="sr-only"
              />
            </label>
            {values.image && (
              <button
                type="button"
                onClick={() => set("image", null)}
                className={buttonClasses({ variant: "danger-outline", size: "sm" })}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                ลบรูป
              </button>
            )}
          </div>
          {imageError ? (
            <p id="menu-image-error" role="alert" className="text-sm font-medium text-danger">
              {imageError}
            </p>
          ) : (
            <p id="menu-image-hint" className="text-xs text-ink-soft">
              JPG หรือ PNG ไม่เกิน 5 MB
            </p>
          )}
        </section>

        <div className={panelClass}>
          <ToggleSwitch
            id="menu-available"
            label="มีขาย"
            checked={values.is_available}
            onChange={(checked) => set("is_available", checked)}
          />
          <p className="mt-1 text-xs text-ink-soft">
            {values.is_available ? "ลูกค้าสั่งเมนูนี้ได้" : "ลูกค้าจะเห็นว่า “หมด” และสั่งไม่ได้"}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="cocoa" fullWidth disabled={imageLoading || saving} aria-busy={saving}>
            {saving ? "กำลังบันทึก…" : submitLabel}
          </Button>
          <Button variant="cocoa-outline" fullWidth onClick={onCancel}>
            ยกเลิก
          </Button>
        </div>
      </div>
    </form>
  );
}
