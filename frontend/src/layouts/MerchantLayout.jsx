/*
  MerchantLayout.jsx
  --------------------------------------------------
  Layout หลักของฝั่งร้านค้า (/merchant/*) ยกเว้นหน้า login

  - ครอบทุกหน้าด้วย MerchantProvider (โหลดร้าน เมนู ออเดอร์ จาก API + รับออเดอร์ใหม่ผ่าน socket)
  - ยังไม่ได้ login (หรือ session หมดอายุ) → ส่งไป /login?role=merchant แล้วค่อยกลับมาหน้าเดิม
  - Desktop (lg ขึ้นไป): sidebar ด้านซ้าย (lg = แถบไอคอน, xl = sidebar เต็ม)
  - มือถือ/แท็บเล็ต: แถบบนบอกชื่อร้าน + แถบเมนูด้านล่าง
*/
import { Navigate, Outlet, useLocation } from "react-router";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { MerchantBottomNav, MerchantSidebar, MerchantTopBar } from "@/features/merchant/components/merchant-nav";
import { MerchantProvider } from "@/features/merchant/merchant-provider";
import { useMerchant } from "@/features/merchant/store";

function FullPageMessage({ children }) {
  return (
    <main className="flex min-h-dvh w-full flex-1 flex-col items-center justify-center gap-4 bg-page px-4 text-center">
      <LogoMark className="size-14 text-2xl" />
      {children}
    </main>
  );
}

function MerchantShell() {
  const { state, reload } = useMerchant();
  const location = useLocation();

  if (state.status === "loading") {
    return (
      <FullPageMessage>
        <p role="status" className="text-ink-soft">
          กำลังโหลดข้อมูลร้าน…
        </p>
      </FullPageMessage>
    );
  }

  if (state.status === "signed-out") {
    return (
      <Navigate
        to="/login?role=merchant"
        replace
        state={{ from: location.pathname + location.search, reason: state.reason }}
      />
    );
  }

  if (state.status === "error") {
    return (
      <FullPageMessage>
        <div role="alert" className="space-y-1">
          <p className="text-lg font-bold text-ink">โหลดข้อมูลร้านไม่สำเร็จ</p>
          <p className="text-sm text-ink-soft">{state.error?.message}</p>
        </div>
        <Button variant="cocoa" size="md" onClick={reload}>
          ลองใหม่
        </Button>
      </FullPageMessage>
    );
  }

  return (
    <div className="flex min-h-dvh min-w-0 w-full flex-1 bg-page">
      <MerchantSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MerchantTopBar />
        <main className="min-w-0 flex-1 pb-24 lg:pb-12">
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
