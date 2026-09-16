/*
  Checkout.jsx
  --------------------------------------------------
  หน้ายืนยันคำสั่งซื้อ

  Flow:

  Cart
    ↓
  Checkout
    ↓
  Confirm Order
    ↓
  Order Detail

  ตอนนี้ข้อมูลทั้งหมดเป็น Mock Data
*/

import { Link } from "react-router-dom";

function Checkout() {
  return (
    <div>
      <h2>Checkout</h2>

      {/* ข้อมูลจัดส่ง */}
      <section>
        <h3>Delivery Address</h3>

        <p>
          123 MealQ Street, Bangkok
        </p>

        <button type="button">
          เปลี่ยนที่อยู่
        </button>
      </section>

      <hr />

      {/* รายการอาหาร */}
      <section>
        <h3>Order Summary</h3>

        <p>กะเพราไก่ x 1 - 60 บาท</p>
        <p>ไข่ดาว x 1 - 15 บาท</p>

        <strong>
          Total: 75 บาท
        </strong>
      </section>

      <hr />

      {/* วิธีชำระเงิน */}
      <section>
        <h3>Payment Method</h3>

        <p>Cash on Delivery</p>
      </section>

      <br />

      {/*
        ตอนนี้ใช้ Link จำลองการสร้าง Order

        เมื่อกดแล้วไป:
        /orders/1001

        ภายหลังจะเปลี่ยนเป็น:
        POST /api/v1/orders

        แล้วนำ ID จริงที่ Backend ส่งกลับมา
        มาใช้กับ URL
      */}
      <Link to="/orders/1001">
        ยืนยันคำสั่งซื้อ
      </Link>

      <br />
      <br />

      <Link to="/cart">
        กลับไป Cart
      </Link>
    </div>
  );
}

export default Checkout;