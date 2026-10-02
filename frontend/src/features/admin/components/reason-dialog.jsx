import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MerchantDialog } from "@/features/merchant/components/merchant-dialog";
import { fieldClass } from "@/features/merchant/styles";
import { cx } from "@/lib/cx";

/**
 * pop-up ยืนยันการกระทำที่กระทบผู้อื่น (ระงับ ยกเลิก ปรับยอด) บังคับใส่เหตุผลเมื่อ requireReason
 * เหตุผลถูกบันทึกลงหน้า "บันทึกการทำงาน" ด้วย
 * onConfirm(reason) คืนข้อความ error ถ้ายังทำไม่ได้ (เช่น ช่องอื่นกรอกไม่ถูก) หรือไม่คืนอะไรถ้าสำเร็จ
 */
export function ReasonDialog({
  title,
  subtitle,
  description,
  confirmLabel,
  danger = true,
  requireReason = true,
  reasonLabel = "เหตุผล",
  onConfirm,
  onClose,
  children,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (requireReason && reason.trim().length < 5) {
      setError("ใส่เหตุผลอย่างน้อย 5 ตัวอักษร");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const problem = await onConfirm(reason.trim());
      if (problem) setError(problem);
    } catch {
      setError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MerchantDialog eyebrow="ผู้ดูแลระบบ" title={title} subtitle={subtitle} onClose={onClose}>
      <form onSubmit={submit} noValidate className="mx-auto max-w-lg space-y-4 rounded-3xl bg-white p-5 ring-1 ring-haze">
        {description && <p className="text-sm text-ink">{description}</p>}
        {children}
        <div className="space-y-2">
          <label htmlFor="admin-reason" className="block text-sm font-semibold text-ink">
            {reasonLabel} {!requireReason && <span className="font-normal text-ink-soft">(ไม่บังคับ)</span>}
          </label>
          <textarea
            id="admin-reason"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "admin-reason-error" : undefined}
            className={cx(fieldClass, "resize-y")}
          />
          {error && (
            <p id="admin-reason-error" role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant={danger ? "danger-outline" : "cocoa"} size="md" disabled={busy}>
            {busy ? "กำลังบันทึก…" : confirmLabel}
          </Button>
          <Button variant="cocoa-outline" size="md" onClick={onClose}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </MerchantDialog>
  );
}
