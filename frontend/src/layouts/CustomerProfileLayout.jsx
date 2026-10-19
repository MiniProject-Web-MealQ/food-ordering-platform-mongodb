import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useOutlet } from "react-router";
import { ArrowLeft, Bell, ChevronDown, ChevronRight, ContactRound, LifeBuoy, LogOut, Mail, Settings2, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { PROFILE_SECTIONS, profilePageFor } from "@/features/customer/profile-navigation";
import { useCustomer } from "@/features/customer/store";
import { logoutWithPushCleanup } from "@/features/customer/push-subscription";
import { postJson } from "@/lib/api-client";
import { usePageTitle } from "@/lib/use-page-title";
import "@/features/customer/profile-account.css";

const ICONS = { user: UserRound, contact: ContactRound, shield: ShieldCheck, bell: Bell, settings: Settings2, mail: Mail, phone: Smartphone };

export default function CustomerProfileLayout() {
  const { state } = useCustomer();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const page = profilePageFor(pathname);
  usePageTitle(`${page.title} · MealQ`);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setLoggingOut(true);
    setError("");
    try {
      await logoutWithPushCleanup({ postJson });
      if (mounted.current) navigate("/login", { replace: true });
    } catch (failure) {
      if (mounted.current) setError(failure.message || "ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      busy.current = false;
      if (mounted.current) setLoggingOut(false);
    }
  }

  return <div className="profile-account">
    <div className="profile-account__shell">
      <nav aria-label="ย้อนกลับจากบัญชี" className="profile-account__mobile-back"><Link to={page.section === "overview" ? "/customer" : "/customer/profile"}><ArrowLeft aria-hidden="true" />{page.section === "overview" ? "กลับหน้าแรก" : "บัญชีของฉัน"}</Link></nav>
      <nav aria-label="ตำแหน่งในบัญชี" className="profile-account__breadcrumbs profile-account__desktop-breadcrumbs">
        <Link to="/customer"><ArrowLeft />หน้าแรก</Link><ChevronRight />
        {page.section === "overview" ? <span aria-current="page">บัญชีของฉัน</span> : <><Link to="/customer/profile">บัญชีของฉัน</Link><ChevronRight />{page.section === "notifications" && page.id !== "notifications" && <><Link to="/customer/profile/notifications">การแจ้งเตือน</Link><ChevronRight /></>}<span aria-current="page">{page.title}</span></>}
      </nav>
      <div className="profile-account__layout">
        <aside className="profile-account__sidebar">
          <div className="profile-account__identity"><span aria-hidden="true">{Array.from(state.user?.name?.trim() || "M").slice(0, 1).join("")}</span><div><strong>{state.user?.name || "บัญชี MealQ"}</strong><small>{state.user?.email}</small></div></div>
          <p className="profile-account__nav-label">จัดการบัญชี</p>
          <nav aria-label="เมนูจัดการบัญชี" className="profile-account__desktop-nav"><ul>{PROFILE_SECTIONS.map((item) => { const Icon = ICONS[item.icon]; return <li key={item.id}><NavLink to={item.path} end={item.id === "overview"} className={({ isActive }) => `profile-account__nav-link${isActive ? " is-active" : ""}`}><Icon aria-hidden="true" /><span>{item.title}</span><ChevronRight className="profile-account__nav-arrow" aria-hidden="true" /></NavLink></li>; })}</ul></nav>
          <details key={pathname} className="profile-account__mobile-menu">
            <summary><span><small>จัดการบัญชี</small><strong>{page.title}</strong></span><ChevronDown aria-hidden="true" /></summary>
            <nav aria-label="เมนูจัดการบัญชีบนมือถือ"><ul>{PROFILE_SECTIONS.map((item) => { const Icon = ICONS[item.icon]; return <li key={item.id}><NavLink to={item.path} end={item.id === "overview"} className={({ isActive }) => `profile-account__nav-link${isActive ? " is-active" : ""}`}><Icon aria-hidden="true" /><span>{item.title}</span><ChevronRight className="profile-account__nav-arrow" aria-hidden="true" /></NavLink></li>; })}</ul></nav>
            <div className="profile-account__mobile-actions"><Link to="/help"><LifeBuoy aria-hidden="true" />ศูนย์ช่วยเหลือ</Link><button type="button" disabled={loggingOut} onClick={logout}><LogOut aria-hidden="true" />{loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</button></div>
          </details>
          <div className="profile-account__sidebar-foot profile-account__desktop-actions"><Link to="/help"><LifeBuoy />ศูนย์ช่วยเหลือ</Link><button type="button" disabled={loggingOut} onClick={logout}><LogOut />{loggingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</button></div>
        </aside>
        <div className="profile-account__content">
          <header className="profile-account__page-header"><p>YOUR MEALQ ACCOUNT</p><h1>{page.title}</h1><span>{page.description}</span></header>
          {error && <p role="alert" className="profile-account__error">{error}</p>}
          <div key={state.user?.id}>{outlet}</div>
        </div>
      </div>
    </div>
  </div>;
}
