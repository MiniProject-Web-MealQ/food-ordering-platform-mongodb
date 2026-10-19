export const PROFILE_SECTIONS = [
  { id: "overview", path: "/customer/profile", title: "บัญชีของฉัน", description: "เลือกจัดการเฉพาะเรื่องที่คุณต้องการ", icon: "user" },
  { id: "personal", path: "/customer/profile/personal", title: "ข้อมูลส่วนตัว", description: "แก้ไขชื่อและเบอร์โทรสำหรับการติดต่อ", icon: "contact" },
  { id: "security", path: "/customer/profile/security", title: "อีเมลและความปลอดภัย", description: "เปลี่ยนอีเมลด้วย OTP และจัดการรหัสผ่าน", icon: "shield" },
  { id: "notifications", path: "/customer/profile/notifications", title: "การแจ้งเตือน", description: "เลือกช่องทางติดตามออเดอร์ที่เหมาะกับคุณ", icon: "bell" },
  { id: "preferences", path: "/customer/profile/preferences", title: "การใช้งานและการชำระเงิน", description: "เลือกวิธีชำระเงินที่ใช้ประจำและดูภาษาของแอป", icon: "settings" },
];

export const NOTIFICATION_CHANNELS = [
  { id: "email", path: "/customer/profile/notifications/email", title: "อีเมลสถานะออเดอร์", description: "รับทุกขั้นตอน ตั้งแต่สั่งสำเร็จจนรับอาหาร ในกล่องเมลของคุณ", icon: "mail" },
  { id: "device", path: "/customer/profile/notifications/device", title: "แจ้งเตือนบนอุปกรณ์นี้", description: "ตั้งค่า Web Push สำหรับคอมพิวเตอร์หรือมือถือที่กำลังใช้อยู่", icon: "phone" },
  { id: "in-app", path: "/customer/profile/notifications/in-app", title: "การแจ้งเตือนในแอป", description: "เลือกสถานะออเดอร์และโปรโมชันที่แสดงใน MealQ", icon: "bell" },
];

export function profilePageFor(pathname) {
  const path = String(pathname).replace(/\/+$/, "");
  const channel = NOTIFICATION_CHANNELS.find((item) => item.path === path);
  if (channel) return { ...channel, section: "notifications" };
  const page = PROFILE_SECTIONS.find((item) => item.path === path) || PROFILE_SECTIONS[0];
  return { ...page, section: page.id };
}
