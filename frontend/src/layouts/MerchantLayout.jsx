// นำเข้า Link และ Outlet จาก react-router
// Link ใช้เปลี่ยนหน้าภายในระบบ Merchant
// Outlet ใช้แสดงหน้าต่าง ๆ เช่น Dashboard, Orders, Menu
import { Link, Outlet } from "react-router";

function MerchantLayout() {
  return (
    <div
      style={{
        // จัด Sidebar และเนื้อหาหลักให้อยู่ข้างกัน
        display: "flex",

        // ให้ Layout สูงเต็มหน้าจอ
        minHeight: "100vh",
      }}
    >
      {/* Sidebar ทางด้านซ้ายของ Merchant Dashboard */}
      <aside
        style={{
          // กำหนดความกว้างของ Sidebar
          width: "220px",

          // ระยะห่างด้านใน Sidebar
          padding: "20px",

          // เส้นแบ่งระหว่าง Sidebar กับเนื้อหาหลัก
          borderRight: "1px solid #ccc",
        }}
      >
        {/* ชื่อระบบฝั่งร้านค้า */}
        <h2>MealQ Merchant</h2>

        {/* เมนูนำทางของฝั่ง Merchant */}
        <nav
          style={{
            // จัดเมนูเป็นแนวตั้ง
            display: "flex",
            flexDirection: "column",

            // ระยะห่างระหว่างเมนู
            gap: "12px",
          }}
        >
          {/* ไปหน้า Dashboard */}
          <Link to="/merchant/dashboard">
            Dashboard
          </Link>

          {/* ไปหน้าจัดการ Order */}
          <Link to="/merchant/orders">
            Orders
          </Link>

          {/* ไปหน้าจัดการเมนูอาหาร */}
          <Link to="/merchant/menu">
            Menu
          </Link>

          {/* ไปหน้าตั้งค่าร้าน */}
          <Link to="/merchant/settings">
            Settings
          </Link>
        </nav>
      </aside>

      {/* พื้นที่หลักทางด้านขวา */}
      <main
        style={{
          // ให้พื้นที่หลักกินพื้นที่ที่เหลือทั้งหมด
          flex: 1,

          // ระยะห่างภายในพื้นที่เนื้อหา
          padding: "24px",
        }}
      >
        {/*
          Outlet จะแสดงหน้าตาม URL

          ตัวอย่าง:
          /merchant/dashboard
          -> Dashboard.jsx

          /merchant/orders
          -> Orders.jsx

          /merchant/menu
          -> Menu.jsx

          /merchant/settings
          -> Settings.jsx
        */}
        <Outlet />
      </main>
    </div>
  );
}

// ส่ง Component นี้ออกไปให้ Router เรียกใช้งาน
export default MerchantLayout;