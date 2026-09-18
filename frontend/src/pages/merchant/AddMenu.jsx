/*
  AddMenu.jsx
  --------------------------------------------------
  หน้าเพิ่มเมนูอาหาร

  ภายหลัง Form นี้จะส่งข้อมูลไป Backend เช่น:

  POST /api/v1/menu
*/

import { Link } from "react-router";

function AddMenu() {
  return (
    <div>
      <h1>Add Menu</h1>

      <form>
        <div>
          <label htmlFor="menu-name">
            ชื่ออาหาร
          </label>

          <br />

          <input
            id="menu-name"
            type="text"
            placeholder="เช่น กะเพราไก่"
          />
        </div>

        <br />

        <div>
          <label htmlFor="menu-price">
            ราคา
          </label>

          <br />

          <input
            id="menu-price"
            type="number"
            placeholder="60"
          />
        </div>

        <br />

        <div>
          <label htmlFor="menu-description">
            รายละเอียด
          </label>

          <br />

          <textarea
            id="menu-description"
            placeholder="รายละเอียดเมนู"
          />
        </div>

        <br />

        {/* ตอนนี้ยังไม่บันทึกจริง */}
        <button type="button">
          Save Menu
        </button>
      </form>

      <br />

      <Link to="/merchant/menu">
        กลับไป Menu
      </Link>
    </div>
  );
}

export default AddMenu;