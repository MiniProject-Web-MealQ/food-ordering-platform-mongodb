import { Link } from "react-router-dom";

function Cart() {
  return (
    <div>
      <h2>Cart</h2>

      {/* ข้อมูลในตะกร้าจำลอง */}
      <p>กะเพราไก่ x 1 - 60 บาท</p>
      <p>ไข่ดาว x 1 - 15 บาท</p>

      <h3>รวม 75 บาท</h3>

      {/* กลับไปเลือกร้านหรืออาหารเพิ่มเติม */}
      <Link to="/restaurants">
        เลือกอาหารเพิ่ม
      </Link>
    </div>
  );
}

export default Cart;