import { Link } from "react-router";
import { ArrowUpRight, Bell, ContactRound, Heart, ReceiptText, Settings2, ShieldCheck, Ticket, UserRound, Wallet } from "lucide-react";
import { PROFILE_SECTIONS } from "@/features/customer/profile-navigation";
import { useCustomer } from "@/features/customer/store";

const ICONS = { contact: ContactRound, shield: ShieldCheck, bell: Bell, settings: Settings2 };

export default function Profile() {
  const { state, couponsLoading, couponsError } = useCustomer();
  const unread = state.notifications.filter((notice) => !notice.read).length;
  return <div className="profile-account__overview">
    <section className="profile-account__welcome"><div><span className="profile-account__pill"><UserRound />บัญชีลูกค้า MealQ</span><h2><span className="profile-account__greeting">สวัสดี,</span><span className="profile-account__welcome-name">{state.user?.name}</span></h2><p>จัดการข้อมูลบัญชีและการตั้งค่าของคุณ เลือกเรื่องที่ต้องการจากเมนูด้านล่าง</p><Link to="/customer/profile/personal">แก้ไขข้อมูลส่วนตัว <ArrowUpRight /></Link></div><div className="profile-account__welcome-mark" aria-hidden="true"><UserRound /><i /><i /></div></section>
    <div className="profile-account__quick-links"><Link to="/customer/orders"><ReceiptText /><span>ออเดอร์ของฉัน<strong>{state.orders.length} รายการ</strong></span><ArrowUpRight /></Link><Link to="/customer/favorites"><Heart /><span>ร้านโปรด<strong>{state.favorites.restaurants.length} ร้าน</strong></span><ArrowUpRight /></Link><Link to="/customer/coupons"><Ticket /><span>คูปองที่เก็บไว้<strong>{couponsLoading ? "กำลังโหลด…" : couponsError ? "เปิดดูรายการ" : `${state.coupons.length} ใบ`}</strong></span><ArrowUpRight /></Link></div>
    <section aria-labelledby="profile-settings-heading"><div className="profile-account__section-heading"><h2 id="profile-settings-heading">อยากจัดการเรื่องไหน?</h2><span>เลือกแล้วเปิดหน้าของเรื่องนั้นโดยเฉพาะ</span></div><div className="profile-account__menu-grid">{PROFILE_SECTIONS.filter((item) => item.id !== "overview").map((item) => { const Icon = ICONS[item.icon]; return <Link key={item.id} to={item.path} className="profile-account__menu-card"><span><Icon /></span><ArrowUpRight className="profile-account__card-arrow" /><h3>{item.title}</h3><p>{item.description}</p><small>เปิดเมนูนี้ <ArrowUpRight /></small></Link>; })}</div></section>
    <div className="profile-account__shortcut-list"><Link to="/customer/wallet"><span className="profile-account__shortcut-icon"><Wallet /></span><span><strong>MealQ Wallet</strong><small>ดูยอดคงเหลือและประวัติการใช้เงิน Demo</small></span><ArrowUpRight /></Link><Link to="/customer/notifications"><span className="profile-account__shortcut-icon"><Bell /></span><span><strong>กล่องแจ้งเตือน</strong><small>{unread ? `มี ${unread} รายการที่ยังไม่ได้อ่าน` : "ดูรายละเอียดสถานะและข้อความของคุณ"}</small></span>{unread > 0 ? <b>{unread}</b> : <ArrowUpRight />}</Link></div>
  </div>;
}
