/*
  Dashboard.jsx
  --------------------------------------------------
  หน้าหลักของร้านค้า

  ใช้แสดงภาพรวม เช่น:
  - Order ใหม่
  - Order ที่กำลังทำ
  - Order ที่เสร็จแล้ว
  - Order ล่าสุด

  ตอนนี้ข้อมูลเป็น Mock Data
*/

import { Link } from "react-router";

function Dashboard() {
  return (
    <div>
      <h1>Merchant Dashboard</h1>

      {/* ข้อมูลสรุปของร้าน */}
      <section>
        <h2>Order Summary</h2>

        <p>New Orders: 5</p>
        <p>Preparing: 3</p>
        <p>Completed: 24</p>
      </section>

      <hr />

      {/* Order ล่าสุด */}
      <section>
        <h2>Recent Orders</h2>

        <p>
          Order #1001 - Pending
        </p>

        <p>
          Order #1000 - Preparing
        </p>

        <Link to="/merchant/orders">
          ดู Orders ทั้งหมด
        </Link>
      </section>
    </div>
  );
}

export default Dashboard;