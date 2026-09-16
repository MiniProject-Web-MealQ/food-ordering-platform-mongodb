// นำเข้า Link และ Outlet จาก react-router-dom
// Link ใช้สำหรับเปลี่ยนหน้าโดยไม่ reload เว็บทั้งหมด
// Outlet คือจุดที่หน้าลูก เช่น Home, Cart, Orders จะถูกนำมาแสดง
import { Link, Outlet } from "react-router-dom";

function CustomerLayout() {
  return (
    <div>
      {/* ส่วนหัวของเว็บฝั่งลูกค้า */}
      <header>
        {/* ชื่อเว็บไซต์ */}
        <h1>MealQ</h1>

        {/* เมนูนำทางหลักของฝั่งลูกค้า */}
        <nav>
          {/* ไปหน้า Home */}
          <Link to="/">Home</Link>{" | "}

          {/* ไปหน้ารายการร้านอาหาร */}
          <Link to="/restaurants">Restaurants</Link>{" | "}

          {/* ไปหน้าประวัติคำสั่งซื้อ */}
          <Link to="/orders">Orders</Link>{" | "}

          {/* ไปหน้าตะกร้าสินค้า */}
          <Link to="/cart">Cart</Link>{" | "}

          {/* ไปหน้า Profile */}
          <Link to="/profile">Profile</Link>{" | "}

          {/* ไปหน้า Login */}
          <Link to="/login">Login</Link>
        </nav>
      </header>

      {/* เส้นคั่นระหว่าง Navbar กับเนื้อหาหลัก */}
      <hr />

      {/* พื้นที่แสดงเนื้อหาหลักของแต่ละหน้า */}
      <main>
        {/*
          Outlet จะถูกแทนด้วยหน้าที่ตรงกับ URL

          ตัวอย่าง:
          /                -> Home.jsx
          /restaurants     -> Restaurants.jsx
          /cart            -> Cart.jsx
          /orders          -> Orders.jsx
        */}
        <Outlet />
      </main>
    </div>
  );
}

// ส่ง Component นี้ออกไปให้ Router เรียกใช้งาน
export default CustomerLayout;