import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { PushSettings } from "@/features/customer/components/push-settings";
import { useMerchant } from "@/features/merchant/store";

export default function MerchantDeviceNotifications() {
  const { state } = useMerchant();
  return <div className="merchant-notifications__stack">
    <div className="merchant-notifications__controls"><PushSettings userId={state.session.id} prefix="/merchant" /></div>
    <p className="merchant-notifications__note">สิทธิ์แจ้งเตือนผูกกับอุปกรณ์และเบราว์เซอร์นี้ หากเปลี่ยนเครื่องให้เปิดแจ้งเตือนบนเครื่องนั้นอีกครั้ง การปิดช่องทางนี้ไม่ปิดอีเมลของร้าน</p>
    <Link to="/merchant/notifications/email" className="merchant-notifications__text-link">เลือกแจ้งเตือนทางอีเมล <ArrowUpRight aria-hidden="true" /></Link>
  </div>;
}
