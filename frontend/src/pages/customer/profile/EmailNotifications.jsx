import { Link } from "react-router";
import { ArrowUpRight, Ban, Check, ChefHat, ClipboardCheck, PackageCheck, ShoppingBag } from "lucide-react";
import { EmailOrderSettings } from "@/features/customer/components/email-order-settings";
import { useCustomer } from "@/features/customer/store";
const STEPS = [
  { title: "รับคำสั่งซื้อแล้ว", text: "ออเดอร์และการชำระเงินได้รับการยืนยันในระบบ", Icon: ShoppingBag },
  { title: "ร้านยืนยันออเดอร์", text: "ร้านรับออเดอร์ของคุณเข้าคิวแล้ว", Icon: ClipboardCheck },
  { title: "กำลังทำอาหาร", text: "ร้านเริ่มเตรียมอาหารให้คุณ", Icon: ChefHat },
  { title: "อาหารพร้อมรับ", text: "ไปที่จุดรับอาหารและแสดงรหัสหรือ QR ให้ร้าน", Icon: PackageCheck },
  { title: "รับอาหารเรียบร้อย", text: "ร้านยืนยันรหัสรับอาหารสำเร็จและปิดออเดอร์แล้ว", Icon: Check },
];
export default function ProfileEmailNotifications() {
  const { state } = useCustomer();
  return <div className="space-y-5"><EmailOrderSettings userId={state.user?.id} email={state.user?.email} /><section className="profile-account__panel"><div className="profile-account__section-heading"><h2>ติดตามได้ครบทุกขั้นตอน</h2><span>ส่งเมื่อออเดอร์เปลี่ยนสถานะจริง</span></div><ol className="profile-account__email-steps">{STEPS.map(({ title, text, Icon }, index) => <li key={title}><span><Icon aria-hidden="true" /></span><div><small>ขั้นตอน {index + 1}</small><h3>{title}</h3><p>{text}</p></div></li>)}</ol><p className="profile-account__cancel-note"><Ban />หากออเดอร์ถูกยกเลิก จะได้รับอีเมลแจ้งสถานะยกเลิกด้วย</p></section><Link to="/customer/profile/security" className="profile-account__text-link">ต้องการเปลี่ยนอีเมลรับแจ้งเตือน? <ArrowUpRight /></Link></div>;
}
