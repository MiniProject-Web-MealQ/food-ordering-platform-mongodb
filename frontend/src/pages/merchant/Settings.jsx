import { LogOut, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { buttonClasses } from "@/components/ui/styles";
import { TextField } from "@/components/ui/text-field";
import { PageHeader } from "@/features/customer/components/page-header";
import { StoreOpenCard } from "@/features/merchant/components/store-open-card";
import { inKitchenCount } from "@/features/merchant/orders";
import { actions, useMerchant } from "@/features/merchant/store";
import { fieldClass, pageClass, panelClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

const FIELD_IDS = {
  name: "store-name",
  phone: "store-phone",
  address: "store-address",
  description: "store-description",
  open_time: "store-open-time",
  close_time: "store-close-time",
  max_queue: "store-max-queue",
};

function storeToValues(store) {
  return {
    name: store.name,
    phone: store.phone ?? "",
    address: store.address?.detail ?? "",
    description: store.description ?? "",
    open_time: store.opening_hours.open_time,
    close_time: store.opening_hours.close_time,
    max_queue: String(store.queue.max_queue),
  };
}

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "กรอกชื่อร้าน";
  else if (values.name.trim().length > 60) errors.name = "ชื่อร้านยาวได้ไม่เกิน 60 ตัวอักษร";
  if (!/^0\d{8,9}$/.test(values.phone.replace(/[\s-]/g, ""))) errors.phone = "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9–10 หลัก";
  if (!values.address.trim()) errors.address = "กรอกจุดรับอาหาร";
  if (values.description.trim().length > 200) errors.description = "คำอธิบายยาวได้ไม่เกิน 200 ตัวอักษร";
  if (!values.open_time) errors.open_time = "เลือกเวลาเปิด";
  if (!values.close_time) errors.close_time = "เลือกเวลาปิด";
  else if (values.open_time && values.close_time <= values.open_time) errors.close_time = "เวลาปิดต้องหลังเวลาเปิด";
  const maxQueue = Number(values.max_queue);
  if (!/^\d+$/.test(values.max_queue) || maxQueue < 1 || maxQueue > 200) errors.max_queue = "จำนวนคิวสูงสุดต้องเป็น 1–200";
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
  const { state, dispatch } = useMerchant();
  const [values, setValues] = useState(() => storeToValues(state.store));
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const errors = validate(values);
  const shown = submitted ? errors : {};
  const errorCount = Object.keys(errors).length;
  const inKitchen = inKitchenCount(state);

  function set(field) {
    return (event) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setSaved(false);
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (errorCount > 0) {
      const first = Object.keys(FIELD_IDS).find((field) => errors[field]);
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    dispatch({
      type: "store/update",
      changes: {
        name: values.name.trim(),
        phone: values.phone.trim(),
        address: { ...state.store.address, detail: values.address.trim() },
        description: values.description.trim(),
        opening_hours: { open_time: values.open_time, close_time: values.close_time },
        queue: { ...state.store.queue, max_queue: Number(values.max_queue) },
      },
    });
    setSaved(true);
    setSubmitted(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <section aria-labelledby="store-info-title" className={cx(panelClass, "space-y-5")}>
        <h2 id="store-info-title" className="text-lg font-bold text-ink">
          ข้อมูลร้าน
        </h2>
        {submitted && errorCount > 0 && <Alert tone="error" title={`ยังบันทึกไม่ได้ มี ${errorCount} ช่องที่ต้องแก้`} />}
        <TextField id={FIELD_IDS.name} label="ชื่อร้าน" value={values.name} error={shown.name} onChange={set("name")} required />
        <div className="grid gap-5 sm:grid-cols-2">
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
          <TextField
            id={FIELD_IDS.address}
            label="จุดรับอาหาร"
            placeholder="เช่น อาคาร 12 ชั้น 1 ช่อง 4"
            value={values.address}
            error={shown.address}
            onChange={set("address")}
            required
          />
        </div>
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
      </section>

      <section aria-labelledby="store-hours-title" className={cx(panelClass, "space-y-5")}>
        <h2 id="store-hours-title" className="text-lg font-bold text-ink">
          เวลาเปิด-ปิด และคิว
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <TimeField id={FIELD_IDS.open_time} label="เวลาเปิด" value={values.open_time} error={shown.open_time} onChange={set("open_time")} />
          <TimeField id={FIELD_IDS.close_time} label="เวลาปิด" value={values.close_time} error={shown.close_time} onChange={set("close_time")} />
        </div>
        <TextField
          id={FIELD_IDS.max_queue}
          label="จำนวนคิวสูงสุด"
          inputMode="numeric"
          value={values.max_queue}
          error={shown.max_queue}
          onChange={set("max_queue")}
          hint={`ลูกค้าจะสั่งไม่ได้เมื่อคิวในครัวครบจำนวนนี้ (ตอนนี้มี ${inKitchen} คิว)`}
          trailing={<span className="pr-4 text-sm font-medium text-ink-soft">คิว</span>}
          required
        />
      </section>

      {saved && <Alert tone="success" title="บันทึกข้อมูลร้านแล้ว" />}
      <Button type="submit" variant="cocoa" className="w-full sm:w-auto">
        บันทึกการตั้งค่า
      </Button>
    </form>
  );
}

function Settings() {
  usePageTitle("ตั้งค่าร้าน");
  const { state, dispatch } = useMerchant();
  const [confirmReset, setConfirmReset] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function resetDemo() {
    dispatch(actions.resetDemo());
    setConfirmReset(false);
    // Remount the form so it shows the restored store details.
    setFormKey((key) => key + 1);
  }

  return (
    <div className={pageClass}>
      <PageHeader title="ตั้งค่าร้าน" subtitle={state.store.name} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6">
        <StoreInfoForm key={formKey} />

        <div className="space-y-4 lg:sticky lg:top-6">
          <StoreOpenCard id="settings-store-open" />

          <section aria-labelledby="account-title" className={cx(panelClass, "space-y-3")}>
            <h2 id="account-title" className="text-lg font-bold text-ink">
              บัญชี
            </h2>
            <p className="text-sm text-ink-soft">
              เข้าสู่ระบบเป็น <span className="font-semibold break-all text-ink">{state.session.email}</span>
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: "session/logout" })}
              className={buttonClasses({ variant: "cocoa-outline", size: "md", fullWidth: true })}
            >
              <LogOut aria-hidden="true" className="size-4" />
              ออกจากระบบ
            </button>
          </section>

          {/* MOCK: only useful while the data lives in localStorage. */}
          <section aria-labelledby="demo-title" className={cx(panelClass, "space-y-3")}>
            <h2 id="demo-title" className="text-lg font-bold text-ink">
              ข้อมูลจำลอง
            </h2>
            <p className="text-sm text-ink-soft">ล้างออเดอร์ เมนู และข้อมูลร้านกลับเป็นค่าเริ่มต้น (ยังอยู่ในระบบต่อ)</p>
            {confirmReset ? (
              <div role="group" aria-label="ยืนยันล้างข้อมูลจำลอง" className="flex flex-wrap gap-2">
                <button type="button" onClick={resetDemo} className={buttonClasses({ variant: "danger-outline", size: "md" })}>
                  ยืนยันล้างข้อมูล
                </button>
                <button type="button" onClick={() => setConfirmReset(false)} className={buttonClasses({ variant: "cocoa-outline", size: "md" })}>
                  ไม่ล้าง
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className={buttonClasses({ variant: "danger-outline", size: "md", fullWidth: true })}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                ล้างข้อมูลจำลอง
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
