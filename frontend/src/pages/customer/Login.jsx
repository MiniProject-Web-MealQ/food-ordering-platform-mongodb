/*
  Login.jsx
  --------------------------------------------------
  หน้าเข้าสู่ระบบของลูกค้า

  ตอนนี้เป็นเพียงโครงหน้า (Skeleton)
  ยังไม่ได้เชื่อม Backend หรือระบบ Authentication จริง

  ภายหลังหน้านี้จะ:
  - รับ Email
  - รับ Password
  - ส่งข้อมูลไป Backend
  - รับ JWT / Session
  - พาผู้ใช้ไปหน้าที่เหมาะสม
*/

import { Link } from "react-router-dom";

function Login() {
  return (
    <div>
      {/* ชื่อหน้า */}
      <h2>Login</h2>

      <p>เข้าสู่ระบบ MealQ</p>

      {/*
        ตอนนี้เป็น Form สำหรับวางโครง UI ก่อน
        ยังไม่มี onSubmit หรือเชื่อม API
      */}
      <form>
        <div>
          <label htmlFor="email">
            Email
          </label>

          <br />

          <input
            id="email"
            type="email"
            placeholder="example@email.com"
          />
        </div>

        <br />

        <div>
          <label htmlFor="password">
            Password
          </label>

          <br />

          <input
            id="password"
            type="password"
            placeholder="Password"
          />
        </div>

        <br />

        {/*
          ตอนนี้ปุ่มยังไม่ Login จริง
          ภายหลังจะเพิ่ม function handleLogin
        */}
        <button type="button">
          Login
        </button>
      </form>

      <br />

      {/* ลิงก์สำหรับผู้ใช้ที่ยังไม่มีบัญชี */}
      <Link to="/register">
        ยังไม่มีบัญชี? สมัครสมาชิก
      </Link>
    </div>
  );
}

export default Login;