import { ScanLine } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import { parsePickupQr } from "../pickup-qr";
import { ScanPickupDialog } from "./scan-pickup-dialog";

/**
 * The customer shows a 4-digit receive_code at the counter; the merchant scans their QR or types
 * the code to hand the food over. The check runs here because the backend does not verify it yet.
 * `scannedCode` pre-fills a code already scanned from the queue board.
 */
export function ReceiveCodeForm({ expectedCode, orderNumber, scannedCode = "", autoFocus = false, onConfirm }) {
  const [code, setCode] = useState(scannedCode);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function confirm(value) {
    if (saving) return;
    if (!/^\d{4}$/.test(value)) {
      setError("กรอกรหัสให้ครบ 4 หลัก");
      return;
    }
    // TODO(api): the backend should check the code (e.g. POST /merchant/orders/:id/receive { receiveCode }).
    if (value !== expectedCode) {
      setError("รหัสไม่ตรงกับออเดอร์นี้ ให้ลูกค้าเปิดรหัสในแอปอีกครั้ง");
      return;
    }
    setSaving(true);
    setError("");
    const result = await onConfirm();
    // On success the order becomes "completed" and this form unmounts.
    if (!result.ok) {
      setSaving(false);
      setError(`บันทึกไม่สำเร็จ: ${result.error.message}`);
    }
  }

  /** A scan that matches this order hands the food over straight away, like typing the code. */
  function handleScan(text) {
    const scan = parsePickupQr(text);
    if (!scan) return { message: "QR นี้ไม่ใช่รหัสรับอาหารของ MealQ" };
    if (scan.orderNumber && scan.orderNumber !== orderNumber) {
      return { message: `QR นี้เป็นของออเดอร์ ${scan.orderNumber} ไม่ใช่ออเดอร์นี้` };
    }
    if (scan.code !== expectedCode) return { message: "รหัสใน QR ไม่ตรงกับออเดอร์นี้" };
    setScanning(false);
    setCode(scan.code);
    confirm(scan.code);
    return null;
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          confirm(code);
        }}
        noValidate
        className="space-y-3"
      >
        <Button variant="cocoa" fullWidth disabled={saving} onClick={() => setScanning(true)}>
          <ScanLine aria-hidden="true" className="size-5" />
          สแกน QR ของลูกค้า
        </Button>

        <div className="flex items-center gap-3 text-xs text-ink-soft" role="separator">
          <span className="h-0.5 flex-1 rounded-full bg-haze" />
          หรือกรอกรหัส
          <span className="h-0.5 flex-1 rounded-full bg-haze" />
        </div>

        <label htmlFor="receive-code" className="block text-sm font-semibold text-ink">
          รหัสรับอาหาร 4 หลักจากลูกค้า
        </label>
        <input
          id="receive-code"
          name="receiveCode"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          // Staff arrive here from the board's "ยืนยันรับอาหาร" button to type the code straight away.
          autoFocus={autoFocus && !scannedCode}
          value={code}
          placeholder="••••"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "receive-code-error" : scannedCode ? "receive-code-scanned" : undefined}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError("");
          }}
          className={cx(
            "h-16 w-full rounded-2xl border-2 border-mint bg-snow text-center font-display text-3xl font-black tracking-[0.5em] text-ink transition",
            "placeholder:text-ink-soft/40 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none aria-invalid:border-alert",
            error && "bg-alert/10",
          )}
        />
        {scannedCode && !error && (
          <p id="receive-code-scanned" className="text-sm font-medium text-brand-ink">
            สแกน QR แล้ว รหัสตรงกับออเดอร์นี้ ตรวจรายการอาหารแล้วกดยืนยัน
          </p>
        )}
        {error && (
          <p id="receive-code-error" role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant={scannedCode ? "cocoa" : "cocoa-outline"}
          fullWidth
          disabled={saving}
          aria-busy={saving}
          // A code scanned on the board lands here pre-filled: one tap to confirm.
          autoFocus={Boolean(scannedCode)}
        >
          {saving ? "กำลังบันทึก…" : "ยืนยันรับอาหาร"}
        </Button>
      </form>

      {scanning && (
        <ScanPickupDialog subtitle={`ออเดอร์ ${orderNumber}`} onScan={handleScan} onClose={() => setScanning(false)} />
      )}
    </>
  );
}
