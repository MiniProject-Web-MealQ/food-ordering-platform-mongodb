import { PageHeader } from "@/features/customer/components/page-header";
import { pageClass, panelClass } from "@/features/merchant/styles";
import { usePageTitle } from "@/lib/use-page-title";

export default function Settings() {
  usePageTitle("ตั้งค่าระบบ");
  return <div className={`${pageClass} space-y-4`}>
    <PageHeader title="ตั้งค่าระบบ" />
    <div className={`${panelClass} space-y-2`}>
      <p className="font-semibold text-ink">ยังไม่มีการตั้งค่าส่วนกลางผ่านหน้านี้</p>
      <p className="text-sm text-ink-soft">ค่าบริการและการเชื่อมต่อกำหนดจาก Backend และไฟล์ environment ของโปรเจกต์ การเปิดรับออเดอร์และจำนวนคิวจัดการได้จากหน้าร้านค้า</p>
    </div>
  </div>;
}
