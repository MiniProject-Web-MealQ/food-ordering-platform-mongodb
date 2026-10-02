import { LayoutDashboard, ReceiptText, Settings, UtensilsCrossed } from "lucide-react";

export const MERCHANT_NAV_ITEMS = [
  { to: "/merchant/dashboard", label: "ภาพรวม", Icon: LayoutDashboard },
  { to: "/merchant/orders", label: "ออเดอร์", Icon: ReceiptText, badge: "pending" },
  { to: "/merchant/menu", label: "เมนู", Icon: UtensilsCrossed },
  { to: "/merchant/settings", label: "ตั้งค่าร้าน", Icon: Settings },
];

export function isMerchantNavActive(item, pathname) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
