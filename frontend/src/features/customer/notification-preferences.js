function preferenceView(data) {
  if (typeof data?.emailOrders !== "boolean" || typeof data?.emailVerified !== "boolean" || typeof data?.emailAvailable !== "boolean") throw new Error("ข้อมูลการแจ้งเตือนยังไม่พร้อม กรุณาลองอีกครั้ง");
  return { emailOrders: data.emailOrders, emailVerified: data.emailVerified, emailAvailable: data.emailAvailable };
}
export async function loadNotificationPreferences(getJson) {
  const result = await getJson("/auth/notification-preferences");
  if (!result.ok) throw new Error(result.error?.message || "โหลดการแจ้งเตือนอีเมลไม่สำเร็จ");
  return preferenceView(result.data);
}
export async function saveNotificationPreferences(patchJson, emailOrders) {
  if (typeof emailOrders !== "boolean") throw new Error("เลือกเปิดหรือปิดแจ้งเตือนอีเมล");
  const result = await patchJson("/auth/notification-preferences", { emailOrders });
  if (!result.ok) throw new Error(result.error?.message || "บันทึกการแจ้งเตือนอีเมลไม่สำเร็จ");
  return preferenceView(result.data);
}
