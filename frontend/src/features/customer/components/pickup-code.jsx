import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Encodes the same pickup code accepted by the merchant scanner. */
export function PickupCode({ code, orderNumber }) {
  const [image, setImage] = useState(null);
  const payload = orderNumber && code ? `MEALQ:${orderNumber}:${code}` : null;
  useEffect(() => {
    let disposed = false;
    if (!payload) return;
    QRCode.toDataURL(payload, { errorCorrectionLevel: "M", width: 256, margin: 4,
      color: { dark: "#000000", light: "#ffffff" } }).then((url) => {
        if (!disposed) setImage({ payload, url });
      }).catch(() => { /* The numeric code remains available. */ });
    return () => { disposed = true; };
  }, [payload]);
  if (!code) return <p className="text-ink-soft">กำลังโหลดรหัสรับอาหาร</p>;
  return <div className="text-center">
    {payload && image?.payload === payload && <img loading="lazy" decoding="async" src={image.url} alt="QR รหัสรับอาหาร" width="256" height="256" className="mx-auto size-52 rounded-2xl bg-white" />}
    <p className="mt-4 font-display text-5xl font-black tracking-[0.2em] text-forest">
      <span className="sr-only">รหัสรับอาหาร </span>{code}
    </p>
  </div>;
}
