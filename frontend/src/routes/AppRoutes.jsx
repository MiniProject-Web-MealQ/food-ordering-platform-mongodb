/*
  AppRoutes.jsx
  --------------------------------------------------
  ไฟล์นี้ใช้เก็บ Route หรือเส้นทางทั้งหมดของเว็บไซต์ MealQ

  ตัวอย่าง:

  /                  -> Home
  /restaurants       -> Restaurants
  /restaurants/1     -> Restaurant Detail
  /cart              -> Cart
  /orders            -> Orders
*/

import { Route, Routes } from "react-router-dom";

// Layout หลักของฝั่งลูกค้า
import CustomerLayout from "../layouts/CustomerLayout";

// Page ฝั่งลูกค้า
import Home from "../pages/customer/Home";
import Restaurants from "../pages/customer/Restaurants";
import RestaurantDetail from "../pages/customer/RestaurantDetail";
import Cart from "../pages/customer/Cart";
import Orders from "../pages/customer/Orders";


function AppRoutes() {
  return (
    <Routes>

      {/*
        Route นี้ไม่มี path

        หมายความว่า Route ลูกทั้งหมดด้านใน
        จะใช้ CustomerLayout ร่วมกัน

        CustomerLayout จะมี Navbar อยู่ด้านบน

        และ <Outlet /> จะเป็นพื้นที่
        สำหรับแสดงแต่ละ Page
      */}
      <Route element={<CustomerLayout />}>

        {/* หน้า Home */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* หน้ารายการร้านอาหาร */}
        <Route
          path="/restaurants"
          element={<Restaurants />}
        />

        {/*
          หน้ารายละเอียดร้าน

          :id เป็น Dynamic Parameter

          ตัวอย่าง:
          /restaurants/1
          /restaurants/2
          /restaurants/abc123
        */}
        <Route
          path="/restaurants/:id"
          element={<RestaurantDetail />}
        />

        {/* หน้าตะกร้าสินค้า */}
        <Route
          path="/cart"
          element={<Cart />}
        />

        {/* หน้ารายการ Order ของลูกค้า */}
        <Route
          path="/orders"
          element={<Orders />}
        />

      </Route>

    </Routes>
  );
}


// ส่ง Router ออกไปให้ App.jsx ใช้งาน
export default AppRoutes;