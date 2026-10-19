import { Link } from "react-router";
import { ArrowUpRight, Bell, Mail, Smartphone } from "lucide-react";

const CHANNELS = [
  { path: "/merchant/notifications/in-app", title: "ข้อความในแอป", description: "ดูออเดอร์ใหม่ การยกเลิกโดยลูกค้า และการรับอาหาร ขยายข้อความเพื่อดูรายละเอียดออเดอร์", action: "เปิดกล่องข้อความ", Icon: Bell },
  { path: "/merchant/notifications/email", title: "แจ้งเตือนทางอีเมล", description: "เปิดหรือปิดอีเมลออเดอร์ที่ส่งถึงบัญชีเจ้าของร้าน เริ่มส่งเฉพาะเหตุการณ์หลังเปิดใช้", action: "ตั้งค่าอีเมล", Icon: Mail },
  { path: "/merchant/notifications/device", title: "แจ้งเตือนบนอุปกรณ์นี้", description: "รับออเดอร์ผ่าน Web Push เมื่อปิดหน้าเว็บ โดยอนุญาตแจ้งเตือนบนเครื่องที่ใช้อยู่", action: "ตั้งค่าอุปกรณ์", Icon: Smartphone },
];

export default function MerchantNotificationOverview() {
  return <div className="merchant-notifications__stack">
    <p className="merchant-notifications__note">อีเมลและการแจ้งเตือนบนอุปกรณ์เปิดหรือปิดแยกกันได้ ส่วนกล่องข้อความในแอปใช้ดูเหตุการณ์ออเดอร์ของร้าน</p>
    <div className="merchant-notifications__channel-list">{CHANNELS.map(({ path, title, description, action, Icon }) => <Link key={path} to={path} className="merchant-notifications__channel-card"><span className="merchant-notifications__channel-icon"><Icon aria-hidden="true" /></span><span className="merchant-notifications__channel-copy"><strong>{title}</strong><span>{description}</span><small>{action}</small></span><ArrowUpRight aria-hidden="true" /></Link>)}</div>
  </div>;
}
