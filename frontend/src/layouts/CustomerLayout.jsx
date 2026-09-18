/*
  CustomerLayout.jsx
  --------------------------------------------------
  Layout หลักของฝั่งลูกค้า (/customer/*)

  - ครอบทุกหน้าด้วย CustomerProvider (ตะกร้า ออเดอร์ ร้านโปรด การแจ้งเตือน)
  - Desktop (lg ขึ้นไป): มี CustomerHeader ด้านบนทุกหน้า
  - มือถือ/แท็บเล็ต: ไม่มี header กลาง แต่ละหน้ามีหัวของตัวเอง

  หน้าที่มี Bottom Nav (เฉพาะมือถือ/แท็บเล็ต) จะอยู่ใน CustomerTabLayout อีกชั้น
  หน้าที่มีปุ่มด้านล่างของตัวเอง (ตะกร้า, ชำระเงิน, รายละเอียดเมนู) อยู่ใน Layout นี้โดยตรง
*/
import { Outlet } from "react-router";
import { CustomerHeader } from "@/features/customer/components/customer-header";
import { CustomerProvider } from "@/features/customer/customer-provider";

function CustomerLayout() {
  return (
    <CustomerProvider>
      <div className="flex min-h-dvh w-full flex-1 flex-col bg-white">
        <CustomerHeader />
        <Outlet />
      </div>
    </CustomerProvider>
  );
}

export default CustomerLayout;
