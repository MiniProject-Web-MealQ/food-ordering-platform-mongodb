/*
  AdminLayout.jsx
  --------------------------------------------------
  Layout หลักของฝั่งผู้ดูแลระบบ (/admin/*) ยกเว้นหน้า login

  - ครอบทุกหน้าด้วย AdminProvider (MOCK: ข้อมูลจำลองใน localStorage รอ API /api/v1/admin/*)
  - ยังไม่ได้ login → ส่งไป /admin/login แล้วค่อยกลับมาหน้าเดิม
  - Desktop (lg ขึ้นไป): sidebar สีเข้มด้านซ้าย ให้ต่างจากหน้าร้านค้า
  - มือถือ/แท็บเล็ต: แถบบน + ปุ่มเปิดเมนู
*/
import { Navigate, Outlet, useLocation } from "react-router";
import { AdminProvider } from "@/features/admin/admin-provider";
import { AdminSidebar, AdminTopBar } from "@/features/admin/components/admin-nav";
import { useAdmin } from "@/features/admin/store";

function AdminShell() {
  const { state } = useAdmin();
  const location = useLocation();

  if (!state.session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return (
    <div className="flex min-h-dvh w-full flex-1 bg-page">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar />
        <main className="flex-1 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminLayout() {
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
}

export default AdminLayout;
