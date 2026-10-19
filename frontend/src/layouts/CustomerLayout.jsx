/*
  CustomerLayout.jsx
  --------------------------------------------------
  Layout หลักของฝั่งลูกค้า (/customer/*)

  - ครอบทุกหน้าด้วย CustomerProvider (ตะกร้า ออเดอร์ ร้านโปรด การแจ้งเตือน)
  - Desktop (lg ขึ้นไป): มี CustomerHeader ด้านบนทุกหน้า
  - มือถือ/แท็บเล็ต: ไม่มี header กลาง แต่ละหน้ามีหัวของตัวเอง

  หน้าที่มี Bottom Nav (เฉพาะมือถือ/แท็บเล็ต) จะอยู่ใน CustomerTabLayout อีกชั้น
  หน้าที่มีปุ่มด้านล่างของตัวเอง (ตะกร้า, ชำระเงิน, รายละเอียดเมนู) อยู่ใน Layout นี้โดยตรง
*/
import { Navigate, Outlet, useLocation } from "react-router";
import { CustomerHeader } from "@/features/customer/components/customer-header";
import { CustomerProvider } from "@/features/customer/customer-provider";
import { useCustomer } from "@/features/customer/store";

function CustomerContent() {
  const { state } = useCustomer();
  const { pathname, search } = useLocation();
  const needsAccount = /^\/customer\/(orders|profile|wallet|coupons|favorites|notifications|checkout)(\/|$)/.test(pathname);
  if (needsAccount && !state.user) return <Navigate to="/login" state={{ from: pathname + search }} replace />;
  return (
    <div className="flex min-h-dvh min-w-0 w-full flex-1 flex-col bg-white">
      <CustomerHeader />
      <Outlet />
    </div>
  );
}

function CustomerLayout() {
  return (
    <CustomerProvider>
      <CustomerContent />
    </CustomerProvider>
  );
}

export default CustomerLayout;
