import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";

/**
 * The customer shows a 4-digit receive_code at the counter; the merchant types it to hand the food over.
 * The check runs here because the backend does not verify receive_code yet.
 */
export function ReceiveCodeForm({ expectedCode, autoFocus = false, onConfirm }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!/^\d{4}$/.test(code)) {
      setError("กรอกรหัสให้ครบ 4 หลัก");
      return;
    }
    // MOCK: replace with a server-side check (e.g. POST /merchant/orders/:id/receive { receiveCode }).
    if (code !== expectedCode) {
      setError("รหัสไม่ตรงกับออเดอร์นี้ ให้ลูกค้าเปิดรหัสในแอปอีกครั้ง");
      return;
    }
    onConfirm();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
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
        autoFocus={autoFocus}
        value={code}
        placeholder="••••"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? "receive-code-error" : undefined}
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
      {error && (
        <p id="receive-code-error" role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="cocoa" fullWidth>
        ยืนยันรับอาหาร
      </Button>
    </form>
  );
}
