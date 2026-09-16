/*
  Cart.jsx
  --------------------------------------------------
  หน้าตะกร้าสินค้าของลูกค้า

  ตอนนี้ใช้ข้อมูลจำลอง
  ภายหลัง Cart อาจเก็บใน React State
  หรือ localStorage
*/

import { Link } from "react-router";

function Cart() {
  return (
    <div>
      <h2>Cart</h2>

      {/* รายการสินค้าใน Cart */}
      <p>กะเพราไก่ x 1 - 60 บาท</p>
      <p>ไข่ดาว x 1 - 15 บาท</p>

      <h3>
        Total: 75 บาท
      </h3>

      {/* กลับไปเลือกอาหาร */}
      <Link to="/restaurants">
        เลือกอาหารเพิ่ม
      </Link>

      <br />
      <br />

      {/* ไปหน้ายืนยัน Order */}
      <Link to="/checkout">
        ไป Checkout
      </Link>
    </div>
  );
}

export default Cart;