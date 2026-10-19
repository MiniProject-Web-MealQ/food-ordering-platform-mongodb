import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { MerchantOrderNotifications } from "@/features/merchant/components/order-notifications";
import { useMerchant } from "@/features/merchant/store";

export default function MerchantInAppNotifications() {
  const { state } = useMerchant();
  return <div className="merchant-notifications__stack">
    <p className="merchant-notifications__note">กดข้อความเพื่อขยายรายละเอียดและเลือกเปิดออเดอร์ การอ่านกล่องข้อความนี้ไม่ต้องเปิดสิทธิ์แจ้งเตือนของอุปกรณ์</p>
    <div className="merchant-notifications__controls"><MerchantOrderNotifications userId={state.session.id} /></div>
    <Link to="/merchant/orders" className="merchant-notifications__text-link">ดูรายการออเดอร์ทั้งหมด <ArrowUpRight aria-hidden="true" /></Link>
  </div>;
}
