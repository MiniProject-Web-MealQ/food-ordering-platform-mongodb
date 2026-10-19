import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { PushSettings } from "@/features/customer/components/push-settings";
import { useCustomer } from "@/features/customer/store";
export default function ProfileDeviceNotifications() {
  const { state } = useCustomer();
  return <div className="space-y-5"><PushSettings userId={state.user?.id} /><p className="profile-account__note">การอนุญาตผูกกับอุปกรณ์และเบราว์เซอร์นี้ หากเปลี่ยนเครื่องต้องเปิดแจ้งเตือนบนเครื่องนั้นอีกครั้ง</p><Link to="/customer/profile/notifications/email" className="profile-account__text-link">ใช้การแจ้งเตือนผ่านอีเมลแทน <ArrowUpRight /></Link></div>;
}
