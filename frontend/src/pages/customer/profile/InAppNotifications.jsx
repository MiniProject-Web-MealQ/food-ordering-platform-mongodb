import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { ToggleSwitch } from "@/features/customer/components/toggle-switch";
import { useCustomer } from "@/features/customer/store";
export default function ProfileInAppNotifications() {
  const { state, dispatch } = useCustomer();
  return <div className="space-y-5"><section className="profile-account__panel"><h2 className="text-lg font-bold text-ink">ข้อความที่แสดงใน MealQ</h2><p className="mt-2 text-sm leading-7 text-ink-soft">ตัวเลือกนี้จัดการข้อความในแอปแยกจากอีเมล การปิดสถานะออเดอร์จะหยุด Web Push ของออเดอร์ด้วย ส่วนประวัติคำสั่งซื้อยังเปิดดูได้ตามปกติ</p><div className="profile-account__setting-row"><ToggleSwitch id="profile-notify-orders" label="สถานะออเดอร์ในแอป" checked={state.settings.notifyReady} onChange={(value) => dispatch({ type: "settings/set", key: "notifyReady", value })} /><p>รับข้อความเมื่อออเดอร์เปลี่ยนสถานะ รวมถึงอาหารพร้อมรับ</p></div><div className="profile-account__setting-row"><ToggleSwitch id="profile-notify-promotions" label="โปรโมชันจากร้านในแอป" checked={state.settings.promotions} onChange={(value) => dispatch({ type: "settings/set", key: "promotions", value })} /><p>แสดงข้อความโปรโมชันในกล่องแจ้งเตือนของคุณ</p></div><p className="text-xs leading-6 text-ink-soft">บันทึกอัตโนมัติ หากบันทึกไม่สำเร็จ ระบบจะแจ้งพร้อมปุ่มลองอีกครั้งด้านบน</p></section><Link to="/customer/notifications" className="profile-account__text-link">ดูข้อความในกล่องแจ้งเตือน <ArrowUpRight /></Link></div>;
}
