/*
  Settings.jsx
  --------------------------------------------------
  หน้าตั้งค่าร้านค้า

  ภายหลังสามารถใช้แก้:
  - ชื่อร้าน
  - รายละเอียดร้าน
  - เวลาเปิด/ปิด
  - ที่อยู่
  - สถานะเปิดรับ Order
*/

function Settings() {
  return (
    <div>
      <h1>Store Settings</h1>

      <form>
        <div>
          <label htmlFor="store-name">
            Store Name
          </label>

          <br />

          <input
            id="store-name"
            type="text"
            defaultValue="MealQ Kitchen"
          />
        </div>

        <br />

        <div>
          <label htmlFor="store-description">
            Description
          </label>

          <br />

          <textarea
            id="store-description"
            defaultValue="ร้านอาหาร MealQ"
          />
        </div>

        <br />

        <div>
          <label>
            <input
              type="checkbox"
              defaultChecked
            />

            {" "}เปิดรับ Order
          </label>
        </div>

        <br />

        {/* ตอนนี้ยังไม่บันทึกจริง */}
        <button type="button">
          Save Settings
        </button>
      </form>
    </div>
  );
}

export default Settings;