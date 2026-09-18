/*
  EditMenu.jsx
  --------------------------------------------------
  หน้าแก้ไขเมนูอาหาร

  ตัวอย่าง URL:

  /merchant/menu/1/edit

  id จะถูกอ่านด้วย useParams()

  ภายหลังจะ:
  - ดึงข้อมูลเมนูจาก Backend
  - แก้ชื่อ
  - แก้ราคา
  - แก้รายละเอียด
  - เปิด/ปิดการขาย
*/

import { Link, useParams } from "react-router";

function EditMenu() {
  const { id } = useParams();

  return (
    <div>
      <h1>Edit Menu</h1>

      <p>
        Menu ID: {id}
      </p>

      <form>
        <div>
          <label htmlFor="edit-menu-name">
            ชื่ออาหาร
          </label>

          <br />

          <input
            id="edit-menu-name"
            type="text"
            defaultValue="กะเพราไก่"
          />
        </div>

        <br />

        <div>
          <label htmlFor="edit-menu-price">
            ราคา
          </label>

          <br />

          <input
            id="edit-menu-price"
            type="number"
            defaultValue="60"
          />
        </div>

        <br />

        {/* ตอนนี้ยังไม่บันทึกจริง */}
        <button type="button">
          Save Changes
        </button>
      </form>

      <br />

      <Link to="/merchant/menu">
        กลับไป Menu
      </Link>
    </div>
  );
}

export default EditMenu;