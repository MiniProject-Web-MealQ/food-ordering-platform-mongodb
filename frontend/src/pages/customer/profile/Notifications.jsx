import { Link } from "react-router";
import { ArrowUpRight, Bell, Mail, Smartphone } from "lucide-react";
import { NOTIFICATION_CHANNELS } from "@/features/customer/profile-navigation";
const ICONS = { bell: Bell, mail: Mail, phone: Smartphone };

export default function ProfileNotifications() {
  return <div className="space-y-5"><div className="profile-account__note"><Bell /><p>แต่ละช่องทางเปิดและปิดแยกกันได้ เลือกตั้งค่าอีเมล อุปกรณ์นี้ หรือข้อความในแอป โดยเปิดเฉพาะหน้าที่ต้องการ</p></div><div className="profile-account__channel-list">{NOTIFICATION_CHANNELS.map((item) => { const Icon = ICONS[item.icon]; return <Link to={item.path} key={item.id}><span className="profile-account__channel-icon"><Icon /></span><span><strong>{item.title}</strong><small>{item.description}</small></span><ArrowUpRight /></Link>; })}</div><Link to="/customer/notifications" className="profile-account__text-link">เปิดกล่องแจ้งเตือนของฉัน <ArrowUpRight /></Link></div>;
}
