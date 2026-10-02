import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PageHeader } from "@/features/customer/components/page-header";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { actions, useAdmin } from "@/features/admin/store";
import { fieldClass, pageClass, panelClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";
import { usePageTitle } from "@/lib/use-page-title";

function SettingsForm({ settings, onSave }) {
  const [fee, setFee] = useState(String(settings.service_fee));
  const [maintenance, setMaintenance] = useState(settings.maintenance_mode);
  const [message, setMessage] = useState(settings.maintenance_message);
  const [categories, setCategories] = useState(settings.categories);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const errors = {};
  if (!/^\d+$/.test(fee) || Number(fee) > 50) errors.fee = "ค่าบริการต้องเป็นจำนวนเต็ม 0–50 บาท";
  if (maintenance && message.trim().length < 5) errors.message = "ใส่ข้อความแจ้งผู้ใช้อย่างน้อย 5 ตัวอักษร";
  if (categories.some((c) => !c.label.trim())) errors.categories = "ชื่อหมวดห้ามว่าง";
  if (!categories.some((c) => c.enabled)) errors.categories = "ต้องเปิดใช้อย่างน้อย 1 หมวด";
  const shown = submitted ? errors : {};

  function touch() {
    setSaved(false);
  }

  function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const changes = {
      service_fee: Number(fee),
      maintenance_mode: maintenance,
      maintenance_message: message.trim(),
      categories: categories.map((c) => ({ ...c, label: c.label.trim() })),
    };
    onSave(changes, `ค่าบริการ ฿${changes.service_fee} · ปิดปรับปรุง: ${maintenance ? "เปิด" : "ปิด"}`);
    setSaved(true);
    setSubmitted(false);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {submitted && Object.keys(errors).length > 0 && <Alert tone="error" title="ยังบันทึกไม่ได้ ตรวจช่องที่ผิด" />}

      <section aria-labelledby="fee-title" className={cx(panelClass, "space-y-4")}>
        <h2 id="fee-title" className="text-lg font-bold text-ink">
          ค่าบริการ
        </h2>
        <TextField
          id="service-fee"
          label="ค่าบริการต่อออเดอร์"
          inputMode="numeric"
          value={fee}
          error={shown.fee}
          hint="บวกเพิ่มทุกออเดอร์ (ตอนนี้ฝั่งลูกค้าเขียนตายตัวไว้ ต้องให้ฝั่งลูกค้าอ่านค่านี้จาก API)"
          trailing={<span className="pr-4 text-sm font-medium text-ink-soft">บาท</span>}
          onChange={(e) => {
            setFee(e.target.value.replace(/\D/g, ""));
            touch();
          }}
        />
      </section>

      <section aria-labelledby="categories-title" className={cx(panelClass, "space-y-4")}>
        <div>
          <h2 id="categories-title" className="text-lg font-bold text-ink">
            หมวดอาหาร
          </h2>
          <p className="text-sm text-ink-soft">แก้ชื่อที่แสดงได้ รหัสหมวดเปลี่ยนไม่ได้ เพราะเมนูและแอปลูกค้าอ้างอิงรหัสนี้</p>
        </div>
        <ul className="space-y-3">
          {categories.map((c, i) => (
            <li key={c.value} className="flex flex-wrap items-end gap-3 rounded-2xl bg-cream p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <label htmlFor={`cat-${c.value}`} className="block text-xs font-semibold text-ink-soft">
                  ชื่อหมวด <span className="font-mono">({c.value})</span>
                </label>
                <input
                  id={`cat-${c.value}`}
                  value={c.label}
                  onChange={(e) => {
                    setCategories((list) => list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)));
                    touch();
                  }}
                  className={cx(fieldClass, "h-11 rounded-full py-0")}
                />
              </div>
              <ToggleSwitch
                id={`cat-on-${c.value}`}
                label={
                  <span className="text-sm">
                    <span className="sr-only">{c.label} </span>เปิดใช้
                  </span>
                }
                checked={c.enabled}
                onChange={(on) => {
                  setCategories((list) => list.map((x, j) => (j === i ? { ...x, enabled: on } : x)));
                  touch();
                }}
              />
            </li>
          ))}
        </ul>
        {shown.categories && (
          <p role="alert" className="text-sm font-medium text-danger">
            {shown.categories}
          </p>
        )}
      </section>

      <section aria-labelledby="maintenance-title" className={cx(panelClass, "space-y-4")}>
        <h2 id="maintenance-title" className="text-lg font-bold text-ink">
          ปิดระบบชั่วคราว
        </h2>
        <ToggleSwitch
          id="maintenance-mode"
          label="ปิดปรับปรุงระบบ"
          checked={maintenance}
          onChange={(on) => {
            setMaintenance(on);
            touch();
          }}
        />
        <p className={cx("text-sm", maintenance ? "font-semibold text-danger" : "text-ink-soft")}>
          {maintenance ? "เมื่อบันทึก ลูกค้าและร้านค้าจะเห็นข้อความด้านล่างและสั่งอาหารไม่ได้" : "ระบบเปิดให้บริการตามปกติ"}
        </p>
        <div className="space-y-2">
          <label htmlFor="maintenance-message" className="block text-sm font-semibold text-ink">
            ข้อความแจ้งผู้ใช้
          </label>
          <textarea
            id="maintenance-message"
            rows={2}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              touch();
            }}
            aria-invalid={Boolean(shown.message) || undefined}
            aria-describedby={shown.message ? "maintenance-message-error" : undefined}
            className={cx(fieldClass, "resize-y")}
          />
          {shown.message && (
            <p id="maintenance-message-error" className="text-sm font-medium text-danger">
              {shown.message}
            </p>
          )}
        </div>
      </section>

      {saved && <Alert tone="success" title="บันทึกตั้งค่าระบบแล้ว" />}
      <Button type="submit" variant="cocoa" className="w-full sm:w-auto">
        บันทึกการตั้งค่า
      </Button>
    </form>
  );
}

function Settings() {
  usePageTitle("ตั้งค่าระบบ");
  const { state, dispatch } = useAdmin();
  const [formKey, setFormKey] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className={cx(pageClass, "space-y-4 lg:space-y-5")}>
      <PageHeader title="ตั้งค่าระบบ" subtitle="ค่าที่ใช้ทั้งเว็บไซต์ (ข้อมูลจำลอง: ยังไม่มีผลกับแอปจริง)" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <SettingsForm key={formKey} settings={state.settings} onSave={(changes, summary) => dispatch(actions.updateSettings(changes, summary))} />

        {/* MOCK: มีประโยชน์เฉพาะตอนข้อมูลอยู่ใน localStorage */}
        <section aria-labelledby="demo-title" className={cx(panelClass, "space-y-3 lg:sticky lg:top-6")}>
          <h2 id="demo-title" className="text-lg font-bold text-ink">
            ข้อมูลจำลอง
          </h2>
          <p className="text-sm text-ink-soft">ล้างทุกอย่างกลับเป็นค่าเริ่มต้น (ร้าน ผู้ใช้ ออเดอร์ คูปอง Wallet และบันทึกการทำงาน) ยังอยู่ในระบบต่อ</p>
          {confirmReset ? (
            <div role="group" aria-label="ยืนยันล้างข้อมูลจำลอง" className="flex flex-wrap gap-2">
              <Button
                variant="danger-outline"
                size="md"
                onClick={() => {
                  dispatch(actions.resetDemo());
                  setConfirmReset(false);
                  setFormKey((k) => k + 1);
                }}
              >
                ยืนยันล้างข้อมูล
              </Button>
              <Button variant="cocoa-outline" size="md" onClick={() => setConfirmReset(false)}>
                ไม่ล้าง
              </Button>
            </div>
          ) : (
            <Button variant="danger-outline" size="md" fullWidth onClick={() => setConfirmReset(true)}>
              <RotateCcw aria-hidden="true" className="size-4" />
              ล้างข้อมูลจำลอง
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}

export default Settings;
