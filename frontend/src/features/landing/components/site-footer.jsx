import { Link } from "react-router";
import { focusRing } from "@/components/ui/styles";

const LINK_GROUPS = [
  {
    title: "ใช้งาน MealQ",
    links: [
      { href: "/register", label: "สำหรับลูกค้า" },
      { href: "/register?role=merchant", label: "สำหรับร้านค้า" },
    ],
  },
  {
    title: "ช่วยเหลือ",
    links: [
      { href: "/help", label: "ช่วยเหลือ" },
      { href: "/terms", label: "เงื่อนไขการใช้งาน" },
      { href: "/privacy", label: "ความเป็นส่วนตัว" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-butter lg:mt-0">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:grid-cols-[2fr_1fr_1fr] sm:px-8 lg:py-16">
        <div className="space-y-3">
          <p className="text-2xl font-bold text-ink lg:text-3xl">MealQ</p>
          <p className="max-w-xs text-muted">
            สั่งก่อน ไม่ต้องต่อคิว — Order fast. Skip the queue.
          </p>
        </div>

        {LINK_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="font-semibold text-ink">{group.title}</p>
            <ul className="mt-3 space-y-2 text-muted">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className={`rounded hover:text-ink hover:underline ${focusRing}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-honey/60">
        <p className="mx-auto w-full max-w-7xl px-5 py-5 text-sm text-muted sm:px-8">
          © 2026 MealQ
        </p>
      </div>
    </footer>
  );
}
