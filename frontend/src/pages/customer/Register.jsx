/*
  Register.jsx
  --------------------------------------------------
  หน้าสมัครสมาชิกของลูกค้า

  ตอนนี้ใช้สำหรับวางโครงหน้าเท่านั้น

  ภายหลังจะส่งข้อมูลไป:
  POST /api/v1/auth/register
*/

import { Link } from "react-router";

function Register() {
  return (
    <div>
      <h2>Register</h2>

      <p>สร้างบัญชี MealQ</p>

      {/* Form สมัครสมาชิก */}
      <form>
        <div>
          <label htmlFor="name">
            Name
          </label>

          <br />

          <input
            id="name"
            type="text"
            placeholder="ชื่อผู้ใช้งาน"
          />
        </div>

        <br />

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

        {/* ตอนนี้ยังไม่ส่งข้อมูลจริง */}
        <button type="button">
          Register
        </button>
      </form>

      <br />

      {/* ถ้ามีบัญชีแล้ว ให้กลับไปหน้า Login */}
      <Link to="/login">
        มีบัญชีแล้ว? Login
      </Link>
    </div>
  );
}

export default Register;