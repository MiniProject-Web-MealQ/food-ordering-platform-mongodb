import { useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { useMerchant } from "../store";
import { useMerchantActions } from "../use-merchant-actions";
import { panelClass } from "../styles";

export function StoreLocationCard() {
  const { state } = useMerchant();
  const { updateStore } = useMerchantActions();
  const [latitude, setLatitude] = useState(String(state.store.coordinates?.latitude ?? ""));
  const [longitude, setLongitude] = useState(String(state.store.coordinates?.longitude ?? ""));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    if (Boolean(latitude.trim()) !== Boolean(longitude.trim())) { setMessage("กรอกพิกัดทั้งสองช่อง หรือล้างทั้งคู่"); return; }
    const coordinates = latitude.trim() && longitude.trim() ? { latitude: Number(latitude), longitude: Number(longitude) } : null;
    setBusy(true);
    const result = await updateStore({ coordinates });
    setMessage(result.ok ? "บันทึกพิกัดร้านแล้ว" : result.error.message);
    setBusy(false);
  }
  return <form onSubmit={save} className={`${panelClass} space-y-4`}>
    <h2 className="text-lg font-bold">พิกัดร้าน</h2>
    <p className="text-sm text-ink-soft">พิกัดนี้แสดงต่อสาธารณะ ใช้ให้ลูกค้าเรียงร้านตามระยะทาง ใส่พิกัดจากแผนที่ของร้าน หรือล้างทั้งสองช่องเพื่อไม่ระบุพิกัด</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label>ละติจูด<input type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} className="mt-1 block w-full rounded-xl border border-haze p-3" /></label>
      <label>ลองจิจูด<input type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} className="mt-1 block w-full rounded-xl border border-haze p-3" /></label>
    </div>
    <button disabled={busy} className={buttonClasses({ variant: "cocoa" })}>{busy ? "กำลังบันทึก…" : "บันทึกพิกัด"}</button>
    {message && <p role="status">{message}</p>}
  </form>;
}
