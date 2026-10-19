import { Link } from "react-router";
import { Logo } from "@/components/brand/logo";
import { buttonClasses, focusRing } from "@/components/ui/styles";

const NAV = [
  { href: "#how-it-works", label: "ใช้งานอย่างไร" },
  { href: "#popular", label: "ร้านอาหาร" },
  { href: "#random-food", label: "สุ่มเมนู" },
  { href: "#faq", label: "คำถามที่พบบ่อย" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-white/90 backdrop-blur-md lg:border-mint">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:py-5">
        <Logo />

        <nav aria-label="เมนูหลัก" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`rounded-full px-4 py-2 font-medium text-ink-soft transition-colors hover:bg-mint hover:text-ink ${focusRing}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/login" className={buttonClasses({ variant: "soft", size: "md" })}>
            เข้าสู่ระบบ
          </Link>
          {/* max-width variant: a media query outranks the base inline-flex, so the hide actually applies. */}
          <Link to="/register" className={`${buttonClasses({ size: "md" })} max-[359px]:hidden`}>
            สมัครฟรี
          </Link>
        </div>
      </div>
    </header>
  );
}
