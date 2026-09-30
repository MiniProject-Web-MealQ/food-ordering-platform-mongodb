import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { chipClasses } from "@/features/customer/styles";
import { buttonClasses } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { cx } from "@/lib/cx";
import { MENU_LIMITS, readMenuImage, toMenuFields, validateMenu } from "../menu-form";
import { MENU_CATEGORY_SUGGESTIONS } from "../mock-data";
import { fieldClass, panelClass } from "../styles";

/** Field order, used to move focus to the first invalid field on submit. */
const FIELD_IDS = { name: "menu-name", category: "menu-category", price: "menu-price", cook_time: "menu-cook-time", description: "menu-description" };

function Unit({ children }) {
  return <span className="pr-4 text-sm font-medium text-ink-soft">{children}</span>;
}

/** Shared by AddMenu and EditMenu. `onSubmit` receives Menu model fields (snake_case, numbers parsed). */
export function MenuForm({ initialValues, menus, editingId = null, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);

  const errors = validateMenu(values, menus, editingId);
  const errorCount = Object.keys(errors).length;
  const categories = [...new Set([...menus.map((m) => m.category), ...MENU_CATEGORY_SUGGESTIONS])];

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

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (errorCount > 0) {
      const first = Object.keys(FIELD_IDS).find((field) => errors[field]);
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    onSubmit(toMenuFields(values));
  }

  const descriptionError = errorFor("description");

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
      <div className={cx(panelClass, "space-y-5")}>
        {submitted && errorCount > 0 && (
          <Alert tone="error" title={`ยังบันทึกไม่ได้ มี ${errorCount} ช่องที่ต้องแก้`} />
        )}

        <TextField label="ชื่อเมนู" placeholder="เช่น ข้าวกะเพราหมูกรอบ" required {...fieldProps("name")} />

        <div className="space-y-2">
          <TextField
            label="หมวดหมู่"
            placeholder="เลือกด้านล่างหรือพิมพ์หมวดใหม่"
            list="menu-category-options"
            autoComplete="off"
            required
            {...fieldProps("category")}
          />
          <datalist id="menu-category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <div role="group" aria-label="เลือกหมวดหมู่ที่มีอยู่" className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={values.category === category}
                onClick={() => set("category", category)}
                className={cx(chipClasses({ selected: values.category === category }), "h-8 px-3 text-xs")}
              >
                {category}
              </button>
            ))}
          </div>
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
          <Button type="submit" variant="cocoa" fullWidth disabled={imageLoading}>
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
