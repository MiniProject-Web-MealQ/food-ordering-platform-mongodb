/*
  CustomerTabLayout.jsx
  --------------------------------------------------
  หน้าหลักของลูกค้าที่มีแถบเมนูด้านล่างบนมือถือ/แท็บเล็ต
  (หน้าแรก / ค้นหาร้าน / ออเดอร์ / สุ่มอาหาร / โปรไฟล์)
  บน Desktop แถบนี้ถูกซ่อน และใช้เมนูใน CustomerHeader แทน
*/
import { Outlet } from "react-router";
import { BottomNav } from "@/features/customer/components/bottom-nav";

function CustomerTabLayout() {
  return (
    <>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}

export default CustomerTabLayout;
