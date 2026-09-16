import { Outlet } from "react-router";
import { AuthShowcase } from "@/features/auth/components/auth-showcase";

export default function AuthLayout() {
  return (
    <main className="flex flex-1 flex-col bg-page lg:grid lg:grid-cols-2 lg:bg-white">
      <AuthShowcase />
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12 lg:px-12 lg:py-16">
        {/* Card on mobile/tablet; on desktop the right half is already a white panel. */}
        <div className="w-full max-w-md rounded-4xl bg-white px-6 py-8 shadow-card sm:px-8 sm:py-10 lg:rounded-none lg:p-0 lg:shadow-none">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
