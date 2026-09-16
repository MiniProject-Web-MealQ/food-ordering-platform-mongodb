/*
  Orders.jsx
  --------------------------------------------------
  หน้าแสดงประวัติ Order ของลูกค้า

  ตอนนี้ใช้ Mock Data
  ภายหลังจะดึงจาก Backend
*/

import { Link } from "react-router";

function Orders() {
  return (
    <div>
      <h2>My Orders</h2>

      {/* Order ตัวอย่าง */}
      <div>
        <p>Order #1001</p>
        <p>Status: Preparing</p>

        <Link to="/orders/1001">
          ดูรายละเอียด
        </Link>
      </div>

      <hr />

      <div>
        <p>Order #1000</p>
        <p>Status: Completed</p>

        <Link to="/orders/1000">
          ดูรายละเอียด
        </Link>
      </div>
    </div>
  );
}

export default Orders;