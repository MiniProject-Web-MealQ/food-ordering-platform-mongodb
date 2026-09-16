/*
  Menu.jsx
  --------------------------------------------------
  หน้าจัดการเมนูอาหารของร้าน

  ภายหลังจะดึงข้อมูลจาก MongoDB

  ร้านสามารถ:
  - ดูเมนู
  - เพิ่มเมนู
  - แก้ไขเมนู
  - ปิด/เปิดการขาย
  - ลบเมนู
*/

import { Link } from "react-router-dom";

function Menu() {
  return (
    <div>
      <h1>Menu Management</h1>

      {/* ไปหน้าเพิ่มเมนู */}
      <Link to="/merchant/menu/new">
        + เพิ่มเมนูอาหาร
      </Link>

      <hr />

      {/* เมนูจำลอง */}
      <div>
        <h3>กะเพราไก่</h3>

        <p>ราคา: 60 บาท</p>
        <p>Status: Available</p>

        <Link to="/merchant/menu/1/edit">
          แก้ไข
        </Link>
      </div>

      <hr />

      <div>
        <h3>ข้าวผัด</h3>

        <p>ราคา: 55 บาท</p>
        <p>Status: Available</p>

        <Link to="/merchant/menu/2/edit">
          แก้ไข
        </Link>
      </div>
    </div>
  );
}

export default Menu;