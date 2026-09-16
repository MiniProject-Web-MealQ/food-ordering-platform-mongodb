/*
  main.jsx
  --------------------------------------------------
  ไฟล์เริ่มต้นของ React Application

  หน้าที่หลัก:
  1. นำ App.jsx มาแสดงใน <div id="root">
  2. เปิดใช้งาน React Router ด้วย BrowserRouter
  3. โหลด CSS กลางของเว็บไซต์
*/

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/*
  BrowserRouter
  ทำให้ React สามารถเปลี่ยนหน้าโดยใช้ URL ได้

  ตัวอย่าง:
  /
  /restaurants
  /cart
  /orders
  /merchant/dashboard

  โดยไม่ต้อง reload เว็บไซต์ใหม่ทั้งหมด
*/
import { BrowserRouter } from "react-router-dom";

// CSS กลางของเว็บไซต์
import "./index.css";

// Component หลักของ Application
import App from "./App.jsx";


/*
  หา element ที่มี id="root"
  ซึ่งอยู่ใน index.html

  แล้วนำ React Application ไปแสดงตรงนั้น
*/
createRoot(document.getElementById("root")).render(
  <StrictMode>

    {/*
      ครอบ App ด้วย BrowserRouter

      เพื่อให้ Component ด้านในทั้งหมด
      สามารถใช้งาน React Router ได้ เช่น:

      <Link />
      <Routes />
      <Route />
      useParams()
      useNavigate()
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>

  </StrictMode>
);