/*
  MerchantLogin.jsx
  --------------------------------------------------
  หน้าเข้าสู่ระบบสำหรับร้านค้า

  ตอนนี้เป็น Skeleton เท่านั้น
  ยังไม่ได้เชื่อม Authentication จริง

  ภายหลัง:
  - รับ Email / Password
  - ส่งไป Backend
  - ตรวจ role = merchant
  - Login สำเร็จ -> /merchant/dashboard
*/

import { Link } from "react-router";

function MerchantLogin() {
  return (
    <div>
      <h1>Merchant Login</h1>

      <p>เข้าสู่ระบบสำหรับร้านค้า MealQ</p>

      <form>
        <div>
          <label htmlFor="merchant-email">
            Email
          </label>

          <br />

          <input
            id="merchant-email"
            type="email"
            placeholder="merchant@mealq.local"
          />
        </div>

        <br />

        <div>
          <label htmlFor="merchant-password">
            Password
          </label>

          <br />

          <input
            id="merchant-password"
            type="password"
            placeholder="Password"
          />
        </div>

        <br />

        {/*
          ตอนนี้ใช้ Link จำลอง Login

          ภายหลังจะเปลี่ยนเป็น button
          ที่เรียก Backend Authentication
        */}
        <Link to="/merchant/dashboard">
          Demo Login
        </Link>
      </form>
    </div>
  );
}

export default MerchantLogin;