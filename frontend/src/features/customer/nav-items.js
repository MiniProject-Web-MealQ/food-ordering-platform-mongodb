import { CompassIcon, DiceIcon, HomeIcon, ReceiptIcon, UserIcon } from "@/components/icons";

export const NAV_ITEMS = [
  { to: "/customer", label: "หน้าแรก", Icon: HomeIcon, match: ["/customer", "/customer/notifications"] },
  { to: "/customer/explore", label: "ค้นหาร้าน", Icon: CompassIcon, match: ["/customer/explore", "/customer/search"] },
  { to: "/customer/orders", label: "ออเดอร์", Icon: ReceiptIcon, match: ["/customer/orders"], prefix: true },
  { to: "/customer/random", label: "สุ่มอาหาร", Icon: DiceIcon, match: ["/customer/random"] },
  { to: "/customer/profile", label: "โปรไฟล์", Icon: UserIcon, match: ["/customer/profile", "/customer/favorites"], prefix: true },
];

export function isNavItemActive(item, pathname) {
  return item.match.some((path) =>
    item.prefix ? pathname === path || pathname.startsWith(`${path}/`) : pathname === path,
  );
}
