/*
  OrderDetail.jsx
  --------------------------------------------------
  หน้ารายละเอียด Order ของร้าน

  ตัวอย่าง URL:

  /merchant/orders/1001

  ภายหลังร้านจะสามารถเปลี่ยนสถานะ:

  pending
  confirmed
  preparing
  ready
  completed
  cancelled

  แล้ว Socket.IO จะส่งสถานะใหม่
  ไปหาลูกค้าแบบ Realtime
*/

import { Link, useParams } from "react-router";

function OrderDetail() {
  // อ่าน Order ID จาก URL
  const { id } = useParams();

  return (
    <div>
      <h1>Order Detail</h1>

      <p>Order #{id}</p>

      <p>
        Customer: Demo Customer
      </p>

      <h3>
        Status: Pending
      </h3>

      <hr />

      <h3>Items</h3>

      <p>กะเพราไก่ x 1 - 60 บาท</p>
      <p>ไข่ดาว x 1 - 15 บาท</p>

      <strong>
        Total: 75 บาท
      </strong>

      <hr />

      {/*
        ปุ่มเหล่านี้ยังไม่ได้ทำงานจริง

        ภายหลังจะเรียก Backend เช่น:
        PATCH /api/v1/orders/:id/status
      */}
      <button type="button">
        Confirm
      </button>

      {" "}

      <button type="button">
        Preparing
      </button>

      {" "}

      <button type="button">
        Ready
      </button>

      {" "}

      <button type="button">
        Completed
      </button>

      <br />
      <br />

      <Link to="/merchant/orders">
        กลับไป Orders
      </Link>
    </div>
  );
}

export default OrderDetail;