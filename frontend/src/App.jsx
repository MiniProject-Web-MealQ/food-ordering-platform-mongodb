/*
  App.jsx
  --------------------------------------------------
  ไฟล์นี้เป็น Component หลักของ Frontend

  หน้าที่ของ App.jsx ในโปรเจกต์ MealQ คือ:
  1. รับการทำงานต่อมาจาก main.jsx
  2. เรียก AppRoutes เพื่อจัดการ Routing ทั้งหมด
  3. ไม่เก็บรายละเอียด UI ของแต่ละหน้าไว้ที่นี่

  โครงสร้างการทำงานจะเป็น:

  main.jsx
      ↓
  App.jsx
      ↓
  AppRoutes.jsx
      ↓
  CustomerLayout / MerchantLayout
      ↓
  Page ต่าง ๆ

  ตัวอย่าง:

  ถ้า URL เป็น:
  /restaurants

  ระบบจะทำงาน:
  main.jsx
      ↓
  App.jsx
      ↓
  AppRoutes.jsx
      ↓
  CustomerLayout.jsx
      ↓
  Restaurants.jsx
*/


// นำ Component AppRoutes เข้ามาใช้งาน
// AppRoutes เป็นไฟล์ที่เก็บ Route ทั้งหมดของเว็บไซต์
//
// ตัวอย่าง Route:
// /
// /restaurants
// /restaurants/1
// /cart
// /orders
// /merchant/dashboard
import AppRoutes from "./routes/AppRoutes";


/*
  Component หลักของ Application

  App ไม่จำเป็นต้องมี Navbar หรือ Sidebar โดยตรง

  เพราะเราจะแยกออกเป็น:

  CustomerLayout.jsx
  -> Layout สำหรับลูกค้า

  MerchantLayout.jsx
  -> Layout สำหรับร้านค้า

  ทำให้โครงสร้างโปรเจกต์อ่านง่าย
  และคนในทีมสามารถแก้แต่ละส่วนได้ง่ายขึ้น
*/
function App() {
  return (
    <>
      {/*
        AppRoutes จะตรวจ URL ปัจจุบันของ Browser

        แล้วเลือกว่าต้องแสดงหน้าอะไร

        เช่น:

        URL:
        /

        จะแสดง:
        CustomerLayout
            ↓
        Home


        URL:
        /restaurants

        จะแสดง:
        CustomerLayout
            ↓
        Restaurants


        URL:
        /cart

        จะแสดง:
        CustomerLayout
            ↓
        Cart


        URL:
        /merchant/dashboard

        จะแสดง:
        MerchantLayout
            ↓
        Dashboard
      */}

      <AppRoutes />
    </>
  );
}


// export App เพื่อให้ main.jsx สามารถ import ไปใช้งานได้
export default App;