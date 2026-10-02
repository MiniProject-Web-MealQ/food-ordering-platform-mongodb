import { KeyRound, LogOut, Menu as MenuIcon, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { focusRing } from "@/components/ui/styles";
import { CountBubble } from "@/features/merchant/components/status-badge";
import { MerchantDialog } from "@/features/merchant/components/merchant-dialog";
import { useNow } from "@/features/merchant/use-now";
import { cx } from "@/lib/cx";
import { ADMIN_NAV_ITEMS, isAdminNavActive } from "../nav-items";
import { attention } from "../stats";
import { useAdmin } from "../store";

function useBadgeCounts() {
  const { state } = useAdmin();
  const now = useNow();
  const { pendingStores, stuckOrders } = attention(state, now);
  return { pendingStores: pendingStores.length, stuckOrders: stuckOrders.length };
}

const BADGE_TEXT = { pendingStores: "ร้านรออนุมัติ", stuckOrders: "ออเดอร์ค้างนาน" };

function NavList({ onNavigate }) {
  const { pathname } = useLocation();
  const counts = useBadgeCounts();

  return (
    <ul className="space-y-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = isAdminNavActive(item, pathname);
        const count = item.badge ? counts[item.badge] : 0;
        return (
          <li key={item.to}>
            <Link
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={count ? `${item.label} (${BADGE_TEXT[item.badge]} ${count})` : undefined}
              className={cx(
                "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                active ? "bg-white text-forest" : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <item.Icon aria-hidden="true" className="size-5" />
              <span className="flex-1">{item.label}</span>
              <CountBubble count={count} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-ink">
        <ShieldCheck className="size-5" />
      </span>
      <span>
        <span className="block text-lg leading-tight font-semibold">MealQ</span>
        <span className="block text-xs text-white/70">ผู้ดูแลระบบ</span>
      </span>
    </span>
  );
}

/** เมนูด้านซ้ายบนจอ lg ขึ้นไป ใช้พื้นสีเข้ม (forest) ให้ต่างจากหน้าร้านค้า จะได้รู้ว่าอยู่ในโหมดผู้ดูแล */
export function AdminSidebar() {
  const { state, dispatch } = useAdmin();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-forest text-white lg:flex">
      <Link to="/admin" className={cx("mx-5 mt-6 rounded-full", focusRing)}>
        <Brand />
      </Link>
      <div className="mx-5 mt-4">
      </div>
      <nav aria-label="เมนูผู้ดูแลระบบ" className="mt-5 flex-1 overflow-y-auto px-3">
        <NavList />
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate px-1 text-sm font-semibold">{state.session.name}</p>
        <p className="truncate px-1 text-xs text-white/70">{state.session.email}</p>
        <Link
          to="/admin/account"
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <KeyRound aria-hidden="true" className="size-5" />
          บัญชีของฉัน / เปลี่ยนรหัสผ่าน
        </Link>
        <button
          type="button"
          onClick={() => dispatch({ type: "session/logout" })}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <LogOut aria-hidden="true" className="size-5" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}

/** แถบบนสำหรับมือถือ/แท็บเล็ต เมนูมีหลายรายการเกินแถบล่าง จึงเปิดเป็นหน้าต่างเมนูแทน */
export function AdminTopBar() {
  const { state, dispatch } = useAdmin();
  const [open, setOpen] = useState(false);
  const counts = useBadgeCounts();
  const total = counts.pendingStores + counts.stuckOrders;

  return (
    <header className="sticky top-0 z-30 bg-forest text-white lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Link to="/admin" className={cx("min-w-0 flex-1 rounded-full", focusRing)}>
          <Brand />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={total ? `เปิดเมนู (มีเรื่องต้องดูแล ${total} รายการ)` : "เปิดเมนู"}
          className="relative grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <MenuIcon aria-hidden="true" className="size-5" />
          <CountBubble count={total} className="absolute -top-0.5 -right-0.5" />
        </button>
      </div>

      {open && (
        <MerchantDialog eyebrow="ผู้ดูแลระบบ" title="เมนู" subtitle={state.session.email} onClose={() => setOpen(false)}>
          <nav aria-label="เมนูผู้ดูแลระบบ" className="rounded-3xl bg-forest p-3">
            <NavList onNavigate={() => setOpen(false)} />
          </nav>
          <Link
            to="/admin/account"
            onClick={() => setOpen(false)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-2 border-cocoa/40 bg-white py-3 text-sm font-semibold text-cocoa hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            บัญชีของฉัน / เปลี่ยนรหัสผ่าน
          </Link>
          <button
            type="button"
            onClick={() => dispatch({ type: "session/logout" })}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border-2 border-cocoa/40 bg-white py-3 text-sm font-semibold text-cocoa hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <LogOut aria-hidden="true" className="size-4" />
            ออกจากระบบ
          </button>
        </MerchantDialog>
      )}
    </header>
  );
}
