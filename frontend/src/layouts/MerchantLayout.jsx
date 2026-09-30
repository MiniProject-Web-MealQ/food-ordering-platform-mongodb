/*
  MerchantLayout.jsx
  --------------------------------------------------
  Layout หลักของฝั่งร้านค้า (/merchant/*) ยกเว้นหน้า login

  - ครอบทุกหน้าด้วย MerchantProvider (ร้าน เมนู ออเดอร์ คิว)
  - ยังไม่ได้ login → ส่งไป /merchant/login แล้วค่อยกลับมาหน้าเดิม
  - Desktop (lg ขึ้นไป): sidebar ด้านซ้าย (lg = แถบไอคอน, xl = sidebar เต็ม)
  - มือถือ/แท็บเล็ต: แถบบนบอกชื่อร้าน + แถบเมนูด้านล่าง
*/
import { Navigate, Outlet, useLocation } from "react-router";
import { MerchantBottomNav, MerchantSidebar, MerchantTopBar } from "@/features/merchant/components/merchant-nav";
import { MerchantProvider } from "@/features/merchant/merchant-provider";
import { useMerchant } from "@/features/merchant/store";

function MerchantShell() {
  const { state } = useMerchant();
  const location = useLocation();

  // MOCK: session lives in localStorage until the merchant pages use the real auth cookie.
  if (!state.session) {
    return <Navigate to="/merchant/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex min-h-dvh w-full flex-1 bg-page">
      <MerchantSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MerchantTopBar />
        <main className="flex-1 pb-24 lg:pb-12">
          <Outlet />
        </main>
        <MerchantBottomNav />
      </div>
    </div>
  );
}

function MerchantLayout() {
  return (
    <MerchantProvider>
      <MerchantShell />
    </MerchantProvider>
  );
}

export default MerchantLayout;
