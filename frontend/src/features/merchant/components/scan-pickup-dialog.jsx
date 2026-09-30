import { useState } from "react";
import { MerchantDialog } from "./merchant-dialog";
import { QrScanner } from "./qr-scanner";

/**
 * pop-up กล้องสำหรับสแกน QR รับอาหารของลูกค้า `onScan(text)` คืน { message } เพื่อบอกว่าทำไม
 * QR นี้ใช้ไม่ได้ (กล้องจะสแกนต่อ) หรือคืนค่าอื่นเพื่อรับ QR นี้
 */
export function ScanPickupDialog({ subtitle, onScan, onClose }) {
  const [message, setMessage] = useState("");

  return (
    <MerchantDialog eyebrow="รับอาหาร" title="สแกน QR ของลูกค้า" subtitle={subtitle} onClose={onClose}>
      <div className="mx-auto max-w-md space-y-3">
        <p
          role="alert"
          className={message ? "rounded-2xl bg-alert/10 px-4 py-2 text-center text-sm font-medium text-danger" : "sr-only"}
        >
          {message}
        </p>
        <QrScanner
          onDetected={(text) => {
            const result = onScan(text);
            if (result?.message) {
              setMessage(result.message);
              return false;
            }
            return true;
          }}
        />
      </div>
    </MerchantDialog>
  );
}
