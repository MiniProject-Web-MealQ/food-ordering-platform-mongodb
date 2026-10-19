import { useEffect, useRef } from "react";
import { Outlet } from "react-router";
import { AuthShowcase } from "@/features/auth/components/auth-showcase";
import "@/features/auth/auth-experience.css";

export default function AuthLayout() {
  const ref = useRef(null);

  useEffect(() => {
    function updateVisibility() {
      if (ref.current) ref.current.dataset.motionPaused = String(document.visibilityState === "hidden");
    }
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return (
    <main ref={ref} className="auth-experience flex min-w-0 flex-1 flex-col bg-page lg:grid lg:grid-cols-2 lg:bg-white">
      <AuthShowcase />
      <div className="auth-form-side relative isolate flex min-w-0 flex-1 items-center justify-center px-4 py-8 sm:py-12 lg:px-10 lg:py-12 xl:px-16">
        <div aria-hidden="true" className="auth-form-ambient pointer-events-none absolute inset-0 -z-10 overflow-hidden" />
        <div className="auth-form-wrap w-full min-w-0 max-w-md rounded-4xl bg-white/95 px-6 py-8 shadow-card sm:px-8 sm:py-10 lg:max-w-lg lg:px-8 xl:px-10">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
