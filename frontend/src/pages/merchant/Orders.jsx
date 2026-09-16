/*
  Orders.jsx
  --------------------------------------------------
  หน้าแสดง Order ทั้งหมดของร้าน

  ภายหลังจะดึงจาก Backend เช่น:

  GET /api/v1/merchant/orders

  และ Socket.IO จะช่วยแจ้ง
  เมื่อมี Order ใหม่เข้ามา
*/

import { Link } from "react-router-dom";

function Orders() {
  return (
    <div>
      <h1>Merchant Orders</h1>

      {/* Order จำลอง */}
      <div>
        <p>Order #1001</p>
        <p>Customer: Demo Customer</p>
        <p>Status: Pending</p>

        <Link to="/merchant/orders/1001">
          ดูรายละเอียด
        </Link>
      </div>

      <hr />

      <div>
        <p>Order #1000</p>
        <p>Customer: Customer Two</p>
        <p>Status: Preparing</p>

        <Link to="/merchant/orders/1000">
          ดูรายละเอียด
        </Link>
      </div>
    </div>
  );
}

export default Orders;