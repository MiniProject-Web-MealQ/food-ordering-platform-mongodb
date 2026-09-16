/*
  OrderDetail.jsx
  --------------------------------------------------
  หน้าแสดงรายละเอียดและสถานะของ Order

  ตัวอย่าง URL:

  /orders/1001
  /orders/1002

  useParams() จะใช้ดึง Order ID ออกจาก URL
*/

import { Link, useParams } from "react-router-dom";

function OrderDetail() {
  /*
    ถ้า URL คือ:

    /orders/1001

    id จะมีค่าเป็น:
    "1001"
  */
  const { id } = useParams();

  return (
    <div>
      <h2>Order Detail</h2>

      {/* Order ID จาก URL */}
      <p>
        Order #{id}
      </p>

      {/* สถานะจำลอง */}
      <h3>
        Status: Preparing
      </h3>

      {/*
        ภายหลังสถานะตรงนี้จะรับมาจาก Backend

        เช่น:
        pending
        confirmed
        preparing
        ready
        completed

        และ Socket.IO จะใช้สำหรับ
        อัปเดตสถานะทันที
      */}

      <hr />

      <h3>Items</h3>

      <p>กะเพราไก่ x 1 - 60 บาท</p>
      <p>ไข่ดาว x 1 - 15 บาท</p>

      <strong>
        Total: 75 บาท
      </strong>

      <br />
      <br />

      {/* กลับไปหน้าประวัติ Order */}
      <Link to="/orders">
        กลับไป My Orders
      </Link>
    </div>
  );
}

export default OrderDetail;