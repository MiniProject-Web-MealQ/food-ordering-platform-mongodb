import jsQR from "jsqr";
import { ImageUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/styles";
import { cx } from "@/lib/cx";

/** ย่อภาพจากกล้องให้กว้างเท่านี้ก่อนอ่าน QR: ชัดพอสำหรับ QR บนจอมือถือ และไม่หนักเครื่องแท็บเล็ต */
const DECODE_WIDTH = 640;
const SCAN_EVERY_MS = 150;
/** หลังปฏิเสธ QR ไปแล้ว ให้ข้าม QR เดิมสักพัก ข้อความเตือนจะได้ไม่กะพริบจนอ่านไม่ทัน */
const REPEAT_PAUSE_MS = 2000;

function cameraErrorMessage(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "ไม่ได้รับอนุญาตให้ใช้กล้อง กดอนุญาตที่แถบที่อยู่ของเบราว์เซอร์ แล้วเปิดใหม่อีกครั้ง";
    case "NotFoundError":
    case "OverconstrainedError":
      return "ไม่พบกล้องในเครื่องนี้";
    case "NotReadableError":
      return "กล้องถูกโปรแกรมอื่นใช้อยู่";
    default:
      return "เปิดกล้องไม่สำเร็จ";
  }
}

function decode(context, source, width, height) {
  const scale = Math.min(1, DECODE_WIDTH / width);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  context.canvas.width = w;
  context.canvas.height = h;
  context.drawImage(source, 0, 0, w, h);
  return jsQR(context.getImageData(0, 0, w, h).data, w, h)?.data ?? null;
}

/**
 * ตัวสแกน QR จากกล้องแบบสด มีทางสำรองให้เลือกรูปแทน
 * `onDetected(text)` คืนค่า false เพื่อสแกนต่อ (เช่น QR เป็นของออเดอร์อื่น)
 */
export function QrScanner({ onDetected }) {
  const videoRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const [cameraError, setCameraError] = useState("");
  const [fileError, setFileError] = useState("");
  const [live, setLive] = useState(false);
  const cameraSupported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  useEffect(() => {
    if (!cameraSupported) return undefined;
    let stopped = false;
    let stream = null;
    let frame = 0;
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    let lastScan = 0;
    let lastRejected = { text: null, at: 0 };

    function tick(time) {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && time - lastScan >= SCAN_EVERY_MS) {
        lastScan = time;
        const text = decode(context, video, video.videoWidth, video.videoHeight);
        const repeat = text === lastRejected.text && time - lastRejected.at < REPEAT_PAUSE_MS;
        if (text && !repeat) {
          if (onDetectedRef.current(text) !== false) return;
          lastRejected = { text, at: time };
        }
      }
      frame = requestAnimationFrame(tick);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        video.srcObject = media;
        await video.play().catch(() => {});
        if (stopped) return;
        setLive(true);
        frame = requestAnimationFrame(tick);
      })
      .catch((error) => {
        if (!stopped) setCameraError(cameraErrorMessage(error));
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraSupported]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileError("");
    try {
      const bitmap = await createImageBitmap(file);
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const text = decode(context, bitmap, bitmap.width, bitmap.height);
      bitmap.close();
      if (!text) setFileError("ไม่พบ QR ในรูปนี้ ลองถ่ายให้ QR ชัดและเต็มกรอบ");
      else onDetectedRef.current(text);
    } catch {
      setFileError("เปิดรูปนี้ไม่ได้");
    }
  }

  const problem = !cameraSupported
    ? "เบราว์เซอร์นี้เปิดกล้องไม่ได้ (ต้องเปิดเว็บผ่าน https หรือ localhost)"
    : cameraError;

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-forest">
        {!problem && (
          <video
            ref={videoRef}
            muted
            playsInline
            aria-label="ภาพจากกล้องสำหรับสแกน QR"
            className="size-full object-cover"
          />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-brand/90" />
        {(problem || !live) && (
          <p
            role={problem ? "alert" : "status"}
            className="absolute inset-0 grid place-items-center px-8 text-center text-sm font-medium text-white"
          >
            {problem || "กำลังเปิดกล้อง…"}
          </p>
        )}
      </div>
      <p className="text-center text-sm text-ink-soft">ให้ลูกค้าเปิด QR รับอาหารในแอป แล้วหันเข้ากล้องให้อยู่ในกรอบ</p>
      <div className="flex flex-col items-center gap-1">
        <label
          className={cx(
            buttonClasses({ variant: "cocoa-outline", size: "sm" }),
            "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
          )}
        >
          <ImageUp aria-hidden="true" className="size-4" />
          เลือกรูป QR แทน
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            aria-describedby={fileError ? "qr-file-error" : undefined}
            className="sr-only"
          />
        </label>
        {fileError && (
          <p id="qr-file-error" role="alert" className="text-sm font-medium text-danger">
            {fileError}
          </p>
        )}
      </div>
    </div>
  );
}
