import { useState } from "react";
import { MerchantDialog } from "./merchant-dialog";
import { QrScanner } from "./qr-scanner";

/**
 * Pop-up camera scanner for a customer's pickup QR. `onScan(text)` returns { message } to show
 * why the QR cannot be used (the camera keeps scanning), or anything else to accept it.
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
