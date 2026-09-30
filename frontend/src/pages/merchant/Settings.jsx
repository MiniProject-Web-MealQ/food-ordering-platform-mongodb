import { LogOut } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { PageHeader } from "@/features/customer/components/page-header";
import { StoreOpenCard } from "@/features/merchant/components/store-open-card";
import { useMerchant } from "@/features/merchant/store";
import { fieldClass, pageClass, panelClass } from "@/features/merchant/styles";
import { useMerchantActions } from "@/features/merchant/use-merchant-actions";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

/** ลำดับช่องกรอก ใช้ย้าย focus ไปช่องแรกที่ผิดตอนกดบันทึก */
const FIELD_IDS = {
  name: "store-name",
  phone: "store-phone",
  description: "store-description",
  open_time: "store-open-time",
  close_time: "store-close-time",
};

function storeToValues(store) {
  return {
    name: store.name,
    phone: store.phone ?? "",
    description: store.description ?? "",
    open_time: store.opening_hours.open_time,
    close_time: store.opening_hours.close_time,
  };
}

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "กรอกชื่อร้าน";
  else if (values.name.trim().length > 60) errors.name = "ชื่อร้านยาวได้ไม่เกิน 60 ตัวอักษร";
  if (!/^0\d{8,9}$/.test(values.phone.replace(/[\s-]/g, ""))) errors.phone = "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก";
  if (values.description.trim().length > 200) errors.description = "คำอธิบายยาวได้ไม่เกิน 200 ตัวอักษร";
  if (!values.open_time) errors.open_time = "เลือกเวลาเปิด";
  if (!values.close_time) errors.close_time = "เลือกเวลาปิด";
  else if (values.open_time && values.close_time <= values.open_time) errors.close_time = "เวลาปิดต้องหลังเวลาเปิด";
  return errors;
}

function TimeField({ id, label, value, error, onChange }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx(fieldClass, "h-14 rounded-full px-6")}
      />
      {error && (
        <p id={`${id}-error`} className="px-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function StoreInfoForm() {
  const { state } = useMerchant();
  const { updateStore } = useMerchantActions();
  const [values, setValues] = useState(() => storeToValues(state.store));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const errors = validate(values);
  const shown = submitted ? errors : {};
  const errorCount = Object.keys(errors).length;
  const pickupPoint = state.store.address?.detail;

  function set(field) {
    return (event) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setResult(null);
    };
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
    const saved = await updateStore({
      name: values.name.trim(),
      phone: values.phone.trim(),
      description: values.description.trim(),
      opening_hours: { open_time: values.open_time, close_time: values.close_time },
    });
    setSaving(false);
    setResult(saved);
    if (saved.ok) setSubmitted(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <section aria-labelledby="store-info-title" className={cx(panelClass, "space-y-5")}>
        <h2 id="store-info-title" className="text-lg font-bold text-ink">
          ข้อมูลร้าน
        </h2>
        {submitted && errorCount > 0 && <Alert tone="error" title={`ยังบันทึกไม่ได้ มี ${errorCount} ช่องที่ต้องแก้`} />}
        <TextField id={FIELD_IDS.name} label="ชื่อร้าน" value={values.name} error={shown.name} onChange={set("name")} required />
        <TextField
          id={FIELD_IDS.phone}
          label="เบอร์โทรร้าน"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          error={shown.phone}
          onChange={set("phone")}
          required
        />
        <div className="space-y-2">
          <label htmlFor={FIELD_IDS.description} className="block text-sm font-semibold text-ink">
            คำอธิบายร้าน <span className="font-normal text-ink-soft">(ไม่บังคับ)</span>
          </label>
          <textarea
            id={FIELD_IDS.description}
            rows={3}
            value={values.description}
            onChange={set("description")}
            aria-invalid={Boolean(shown.description) || undefined}
            aria-describedby={shown.description ? `${FIELD_IDS.description}-error` : undefined}
            className={cx(fieldClass, "resize-y")}
          />
          {shown.description && (
            <p id={`${FIELD_IDS.description}-error`} className="px-1 text-sm font-medium text-danger">
              {shown.description}
            </p>
          )}
        </div>
        {/* TODO(api): PATCH /merchant/store ยังไม่รับ address จึงแสดงให้ดูอย่างเดียว */}
        <div className="rounded-2xl bg-cream px-4 py-3 text-sm">
          <p className="font-semibold text-ink">จุดรับอาหาร</p>
          <p className="text-ink-soft">{pickupPoint || "ยังไม่ได้ตั้ง"}</p>
          <p className="mt-1 text-xs text-ink-soft">ยังแก้จากหน้านี้ไม่ได้ ติดต่อผู้ดูแลระบบหากต้องการเปลี่ยน</p>
        </div>
      </section>

      <section aria-labelledby="store-hours-title" className={cx(panelClass, "space-y-5")}>
        <h2 id="store-hours-title" className="text-lg font-bold text-ink">
          เวลาเปิด-ปิด
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TimeField id={FIELD_IDS.open_time} label="เวลาเปิด" value={values.open_time} error={shown.open_time} onChange={set("open_time")} />
          <TimeField id={FIELD_IDS.close_time} label="เวลาปิด" value={values.close_time} error={shown.close_time} onChange={set("close_time")} />
        </div>
      </section>

      {result?.ok && <Alert tone="success" title="บันทึกข้อมูลร้านแล้ว" />}
      {result && !result.ok && (
        <Alert tone="error" title="บันทึกไม่สำเร็จ">
          {result.error.message}
        </Alert>
      )}
      <Button type="submit" variant="cocoa" className="w-full sm:w-auto" disabled={saving} aria-busy={saving}>
        {saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
      </Button>
    </form>
  );
}

function Settings() {
  usePageTitle("ตั้งค่าร้าน");
  const { state } = useMerchant();
  const { logout } = useMerchantActions();

  return (
    <div className={pageClass}>
      <PageHeader title="ตั้งค่าร้าน" subtitle={state.store.name} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <StoreInfoForm />

        <div className="space-y-4 lg:sticky lg:top-6">
          <StoreOpenCard id="settings-store-open" />

          <section aria-labelledby="account-title" className={cx(panelClass, "space-y-3")}>
            <h2 id="account-title" className="text-lg font-bold text-ink">
              บัญชี
            </h2>
            <p className="text-sm text-ink-soft">
              เข้าสู่ระบบเป็น <span className="font-semibold break-all text-ink">{state.session.email}</span>
            </p>
            <button type="button" onClick={logout} className={buttonClasses({ variant: "cocoa-outline", size: "md", fullWidth: true })}>
              <LogOut aria-hidden="true" className="size-4" />
              ออกจากระบบ
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
