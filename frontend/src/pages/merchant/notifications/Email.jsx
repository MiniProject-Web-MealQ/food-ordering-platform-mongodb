import { Link } from "react-router";
import { ArrowUpRight, Ban, PackageCheck, ShoppingBag } from "lucide-react";
import { EmailOrderSettings } from "@/features/customer/components/email-order-settings";
import { useMerchant } from "@/features/merchant/store";

const EVENTS = [
  { title: "ออเดอร์ใหม่", description: "เมื่อลูกค้าสั่งซื้อสำเร็จ เพื่อให้ร้านเตรียมรับออเดอร์", Icon: ShoppingBag },
  { title: "ลูกค้ายกเลิกออเดอร์", description: "แจ้งเมื่อออเดอร์ถูกยกเลิกโดยลูกค้า", Icon: Ban },
  { title: "รับอาหารเรียบร้อย", description: "เมื่อร้านตรวจรหัสรับอาหารสำเร็จและปิดออเดอร์", Icon: PackageCheck },
];

export default function MerchantEmailNotifications() {
  const { state } = useMerchant();
  return <div className="merchant-notifications__stack">
    <div className="merchant-notifications__controls"><EmailOrderSettings userId={state.session.id} email={state.session.email} merchant /></div>
    <section className="merchant-notifications__panel"><h2>เหตุการณ์ที่ส่งถึงเจ้าของร้าน</h2><p className="merchant-notifications__muted">ส่งตามเหตุการณ์ออเดอร์จริงหลังเปิดใช้งาน ไม่ส่งอีเมลย้อนหลัง</p><ul className="merchant-notifications__events">{EVENTS.map(({ title, description, Icon }) => <li key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div></li>)}</ul></section>
    <Link to="/merchant/notifications/device" className="merchant-notifications__text-link">ตั้งค่าแจ้งเตือนบนอุปกรณ์นี้ด้วย <ArrowUpRight aria-hidden="true" /></Link>
  </div>;
}
