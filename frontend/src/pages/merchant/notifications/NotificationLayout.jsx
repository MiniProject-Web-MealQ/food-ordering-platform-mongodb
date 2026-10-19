import { Link, NavLink, useLocation, useOutlet } from "react-router";
import { ArrowLeft, Bell, ChevronDown, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useMerchant } from "@/features/merchant/store";
import { pageClass } from "@/features/merchant/styles";
import { usePageTitle } from "@/lib/use-page-title";
import "./merchant-notifications.css";

const PAGES = [
  { path: "/merchant/notifications", title: "แจ้งเตือนร้าน", label: "ภาพรวม", description: "เลือกดูข้อความออเดอร์ หรือตั้งค่าอีเมลและอุปกรณ์แยกกัน", Icon: Bell },
  { path: "/merchant/notifications/in-app", title: "ข้อความในแอป", label: "ในแอป", description: "ดูเหตุการณ์ออเดอร์ของร้านและเปิดรายละเอียดจากแต่ละข้อความ", Icon: Bell },
  { path: "/merchant/notifications/email", title: "แจ้งเตือนทางอีเมล", label: "อีเมล", description: "จัดการอีเมลออเดอร์ที่ส่งถึงบัญชีเจ้าของร้าน", Icon: Mail },
  { path: "/merchant/notifications/device", title: "แจ้งเตือนบนอุปกรณ์นี้", label: "อุปกรณ์นี้", description: "เปิดหรือปิด Web Push สำหรับอุปกรณ์และเบราว์เซอร์ที่ใช้อยู่", Icon: Smartphone },
];

function ChannelLinks() {
  return <ul>{PAGES.map(({ path, label, Icon }) => <li key={path}><NavLink to={path} end className={({ isActive }) => `merchant-notifications__nav-link${isActive ? " is-active" : ""}`}><Icon aria-hidden="true" /><span>{label}</span></NavLink></li>)}</ul>;
}

export default function MerchantNotificationLayout() {
  const { state } = useMerchant();
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const normalizedPath = pathname.replace(/\/+$/, "");
  const page = PAGES.find((item) => item.path === normalizedPath) || PAGES[0];
  const owner = state.session?.accountRole === "merchant";
  usePageTitle(page.title);

  return <div className={`${pageClass} merchant-notifications`}>
    <Link to="/merchant/settings" className="merchant-notifications__back"><ArrowLeft aria-hidden="true" />ตั้งค่าร้าน</Link>
    <header className="merchant-notifications__header"><p>การแจ้งเตือนสำหรับเจ้าของร้าน</p><h1>{page.title}</h1><span>{page.description}</span></header>
    {owner ? <>
      <nav aria-label="ช่องทางแจ้งเตือนร้าน" className="merchant-notifications__desktop-nav"><ChannelLinks /></nav>
      <details key={pathname} className="merchant-notifications__mobile-menu"><summary><span><small>ช่องทางแจ้งเตือน</small><strong>{page.label}</strong></span><ChevronDown aria-hidden="true" /></summary><nav aria-label="ช่องทางแจ้งเตือนร้านบนมือถือ"><ChannelLinks /></nav></details>
      <div key={state.session.id} className="merchant-notifications__content">{outlet}</div>
    </> : <section className="merchant-notifications__panel merchant-notifications__owner-note"><ShieldCheck aria-hidden="true" /><div><h2>ใช้บัญชีเจ้าของร้านเพื่อจัดการแจ้งเตือน</h2><p>กล่องข้อความ อีเมล และการแจ้งเตือนบนอุปกรณ์ของร้านจัดการได้เฉพาะเจ้าของร้าน บัญชีพนักงานยังเปลี่ยนการตั้งค่าส่วนนี้แทนไม่ได้</p><Link to="/merchant/orders" className="merchant-notifications__text-link">กลับไปจัดการออเดอร์</Link></div></section>}
  </div>;
}
