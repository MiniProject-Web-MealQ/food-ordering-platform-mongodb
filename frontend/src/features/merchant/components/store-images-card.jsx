import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { buttonClasses } from "@/components/ui/styles";
import { cx } from "@/lib/cx";
import { readImageFile } from "../image";
import { useMerchant } from "../store";
import { panelClass } from "../styles";
import { useMerchantActions } from "../use-merchant-actions";

/**
 * ขนาดที่ย่อก่อนส่ง หน้าลูกค้าแสดงแบนเนอร์หลายสัดส่วน (การ์ด 16:7, หน้าร้านมือถือ 16:9, คอมกว้างกว่านั้น)
 * และตัดขอบให้พอดีเอง จึงใช้ 2:1 เป็นค่ากลาง ส่วนโลโก้แสดงเป็นวงกลมจึงตัดเป็นสี่เหลี่ยมจัตุรัส
 */
const BANNER = { width: 1200, height: 600, quality: 0.8 };
const LOGO = { width: 400, height: 400, quality: 0.85 };
/** backend รับ JSON ได้ไม่เกิน 1 MB ต่อครั้ง เผื่อที่ให้ field อื่นไว้ */
const MAX_PAYLOAD_CHARS = 900_000;

function ImagePicker({ id, label, busy, hasImage, onPick, onRemove }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        className={cx(
          buttonClasses({ variant: "cocoa-outline", size: "sm" }),
          "relative cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <ImagePlus aria-hidden="true" className="size-4" />
        {busy ? "กำลังเตรียมรูป…" : hasImage ? `เปลี่ยน${label}` : `เลือก${label}`}
        <input id={id} type="file" accept="image/*" onChange={onPick} disabled={busy} className="sr-only" />
      </label>
      {hasImage && (
        <button type="button" onClick={onRemove} className={buttonClasses({ variant: "danger-outline", size: "sm" })}>
          <Trash2 aria-hidden="true" className="size-4" />
          ลบ{label}
        </button>
      )}
    </div>
  );
}

/** ตั้งรูปโปรไฟล์ร้าน (โลโก้) และแบนเนอร์ พร้อมตัวอย่างแบบที่ลูกค้าเห็นในหน้าร้าน */
export function StoreImagesCard() {
  const { state } = useMerchant();
  const { updateStore } = useMerchantActions();
  const { store } = state;
  // ค่าที่เลือกไว้แต่ยังไม่ได้บันทึก (undefined = ใช้ค่าที่ร้านมีอยู่)
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const banner = draft.cover_image !== undefined ? draft.cover_image : store.cover_image;
  const logo = draft.logo !== undefined ? draft.logo : store.logo;
  const dirty = Object.keys(draft).length > 0;

  function pick(field, size) {
    return async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setBusy(field);
      setError("");
      setResult(null);
      try {
        const dataUrl = await readImageFile(file, size);
        setDraft((d) => ({ ...d, [field]: dataUrl }));
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(null);
      }
    };
  }

  function remove(field) {
    setDraft((d) => ({ ...d, [field]: null }));
    setResult(null);
  }

  async function save() {
    if (!dirty || saving) return;
    const size = Object.values(draft).reduce((sum, v) => sum + (v?.length ?? 0), 0);
    if (size > MAX_PAYLOAD_CHARS) {
      setError("รูปรวมกันใหญ่เกินไป ลองเลือกรูปที่มีรายละเอียดน้อยลง หรือบันทึกทีละรูป");
      return;
    }
    setSaving(true);
    setError("");
    const saved = await updateStore(draft);
    setSaving(false);
    if (!saved.ok) {
      setResult({ kind: "error", message: saved.error.message });
      return;
    }
    // backend ที่ยังไม่รองรับรูปจะตอบสำเร็จแต่ไม่บันทึก: เทียบกับค่าที่ส่งไปเพื่อบอกผู้ใช้ตามจริง
    const returned = saved.data.store ?? {};
    const stored =
      (draft.logo === undefined || (returned.logo || null) === draft.logo) &&
      (draft.cover_image === undefined || (returned.coverImage || null) === draft.cover_image);
    if (stored) {
      setDraft({});
      setResult({ kind: "success" });
    } else {
      setResult({ kind: "unsupported" });
    }
  }

  return (
    <section aria-labelledby="store-images-title" aria-busy={saving} className={cx(panelClass, "space-y-4")}>
      <div>
        <h2 id="store-images-title" className="text-lg font-bold text-ink">
          รูปร้าน
        </h2>
        <p className="text-sm text-ink-soft">ลูกค้าจะเห็นแบนเนอร์และรูปโปรไฟล์นี้ในรายการร้านและหน้าร้าน</p>
      </div>

      {/* ตัวอย่างแบบหน้าร้านฝั่งลูกค้า: แบนเนอร์เต็มความกว้าง รูปโปรไฟล์วงกลมทับมุมล่างซ้าย */}
      <figure aria-label="ตัวอย่างหน้าร้านที่ลูกค้าเห็น" className="overflow-hidden rounded-3xl bg-cream ring-1 ring-haze">
        {banner ? (
          <img loading="lazy" decoding="async" src={banner} alt="แบนเนอร์ร้าน" className="aspect-video w-full object-cover" />
        ) : (
          <ImagePlaceholder label="ยังไม่มีแบนเนอร์" className="aspect-video w-full border-x-0 border-t-0" />
        )}
        <div className="flex items-end gap-3 px-4 pb-4">
          <div className="-mt-10 shrink-0">
            {logo ? (
              <img loading="lazy" decoding="async" src={logo} alt="รูปโปรไฟล์ร้าน" className="size-20 rounded-full object-cover ring-4 ring-white" />
            ) : (
              <ImagePlaceholder compact label="โลโก้" className="size-20 rounded-full ring-4 ring-white" />
            )}
          </div>
          <figcaption className="min-w-0 pb-1">
            <span className="block truncate text-lg font-bold text-ink">{store.name}</span>
            <span className="block text-xs text-ink-soft">ตัวอย่างหน้าร้านฝั่งลูกค้า</span>
          </figcaption>
        </div>
      </figure>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-ink">แบนเนอร์</p>
          <ImagePicker
            id="store-banner-input"
            label="แบนเนอร์"
            busy={busy === "cover_image"}
            hasImage={Boolean(banner)}
            onPick={pick("cover_image", BANNER)}
            onRemove={() => remove("cover_image")}
          />
          <p className="text-xs text-ink-soft">ภาพแนวนอน ระบบตัดเป็น 2:1 (1200×600) และหน้าลูกค้าอาจตัดขอบบน-ล่างตามขนาดจอ วางของสำคัญไว้กลางรูป</p>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-ink">รูปโปรไฟล์ร้าน</p>
          <ImagePicker
            id="store-logo-input"
            label="รูปโปรไฟล์"
            busy={busy === "logo"}
            hasImage={Boolean(logo)}
            onPick={pick("logo", LOGO)}
            onRemove={() => remove("logo")}
          />
          <p className="text-xs text-ink-soft">แสดงเป็นวงกลม ระบบตัดเป็นสี่เหลี่ยมจัตุรัส (400×400) จากกลางรูป</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {result?.kind === "success" && <Alert tone="success" title="บันทึกรูปร้านแล้ว ลูกค้าจะเห็นรูปใหม่" />}
      {result?.kind === "error" && (
        <Alert tone="error" title="บันทึกรูปไม่สำเร็จ">
          {result.message}
        </Alert>
      )}
      {result?.kind === "unsupported" && (
        <Alert tone="error" title="ระบบหลังบ้านยังไม่รองรับการบันทึกรูปร้าน">
          ข้อมูลอื่นบันทึกได้ตามปกติ แต่รูปยังไม่ถูกเก็บ รอทีมหลังบ้านเพิ่มการรับ logo และ coverImage ใน PATCH /merchant/store
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="cocoa" size="md" onClick={save} disabled={!dirty || saving || Boolean(busy)} aria-busy={saving}>
          {saving ? "กำลังบันทึก…" : "บันทึกรูปร้าน"}
        </Button>
        {dirty && (
          <Button
            variant="cocoa-outline"
            size="md"
            onClick={() => {
              setDraft({});
              setResult(null);
              setError("");
            }}
          >
            ยกเลิกที่เลือก
          </Button>
        )}
      </div>
    </section>
  );
}
