import { Navigate, Outlet, useLocation } from "react-router";
import { AdminProvider } from "@/features/admin/admin-provider";
import { AdminSidebar, AdminTopBar } from "@/features/admin/components/admin-nav";
import { useAdmin } from "@/features/admin/store";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function AdminShell() {
  const { state, loading, busy, error, refresh } = useAdmin();
  const location = useLocation();
  if (loading) return <main role="status" className="grid min-h-dvh place-items-center">กำลังโหลดข้อมูลผู้ดูแล…</main>;
  if (!state.session && error) return <main className="mx-auto max-w-lg space-y-4 px-4 py-20"><Alert tone="error" title={error} /><Button onClick={refresh}>ลองใหม่</Button></main>;
  if (!state.session) return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  if (state.session.must_change_password && location.pathname !== "/admin/account") return <Navigate to="/admin/account" replace />;
  return (
    <div className="flex min-h-dvh w-full flex-1 bg-page">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar />
        {error && <div className="px-4 pt-4"><Alert tone="error" title={error} /></div>}
        {busy && <p role="status" className="px-4 pt-2 text-sm text-ink-soft">กำลังบันทึก…</p>}
        <main className="flex-1 pb-16" aria-busy={busy}><Outlet /></main>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return <AdminProvider><AdminShell /></AdminProvider>;
}
