const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * อ่านไฟล์รูปที่ผู้ใช้เลือก แล้วย่อเป็น JPEG data URL ขนาดเล็ก
 * - ไม่ส่ง width/height: ย่อให้ด้านยาวสุดไม่เกิน maxSide โดยไม่ตัดรูป (ใช้กับรูปเมนู)
 * - ส่ง width/height: ตัดรูปตรงกลางให้ได้สัดส่วน width:height แล้วย่อไม่เกินขนาดนั้น (ใช้กับแบนเนอร์/โลโก้ร้าน)
 * TODO(api): เปลี่ยนไปใช้ endpoint อัปโหลดรูปที่คืน URL เมื่อ backend มีให้ (ตอนนี้เก็บ data URL ตรง ๆ)
 */
export async function readImageFile(file, { width, height, maxSide = 480, quality = 0.8 } = {}) {
  if (!file.type.startsWith("image/")) throw new Error("เลือกได้เฉพาะไฟล์รูปภาพ");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("รูปใหญ่เกิน 5 MB");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("เปิดไฟล์รูปนี้ไม่ได้ ลองใช้ไฟล์ JPG หรือ PNG");
  }

  // ส่วนของรูปต้นฉบับที่จะใช้ (sx, sy, sw, sh)
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  let outW;
  let outH;
  if (width && height) {
    const target = width / height;
    if (sw / sh > target) {
      sw = Math.round(sh * target);
      sx = Math.round((bitmap.width - sw) / 2);
    } else {
      sh = Math.round(sw / target);
      sy = Math.round((bitmap.height - sh) / 2);
    }
    const scale = Math.min(1, width / sw);
    outW = Math.round(sw * scale);
    outH = Math.round(sh * scale);
  } else {
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    outW = Math.round(sw * scale);
    outH = Math.round(sh * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const context = canvas.getContext("2d");
  // พื้นขาวรองไว้ก่อน รูป PNG โปร่งใสจะได้ไม่กลายเป็นพื้นดำตอนแปลงเป็น JPEG
  context.fillStyle = "white";
  context.fillRect(0, 0, outW, outH);
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
