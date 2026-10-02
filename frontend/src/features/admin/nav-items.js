import { BarChart3, History, LayoutDashboard, ReceiptText, Settings, Store, TicketPercent, Users, Wallet } from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  { to: "/admin", label: "ภาพรวม", Icon: LayoutDashboard, exact: true },
  { to: "/admin/stores", label: "ร้านค้า", Icon: Store, badge: "pendingStores" },
  { to: "/admin/users", label: "ผู้ใช้", Icon: Users },
  { to: "/admin/orders", label: "ออเดอร์", Icon: ReceiptText, badge: "stuckOrders" },
  { to: "/admin/promotions", label: "คูปอง", Icon: TicketPercent },
  { to: "/admin/wallets", label: "Wallet", Icon: Wallet },
  { to: "/admin/reports", label: "รายงาน", Icon: BarChart3 },
  { to: "/admin/settings", label: "ตั้งค่าระบบ", Icon: Settings },
  { to: "/admin/activity", label: "บันทึกการทำงาน", Icon: History },
];

export function isAdminNavActive(item, pathname) {
  return item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
}
