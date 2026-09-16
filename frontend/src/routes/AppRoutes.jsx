/*
  AppRoutes.jsx
  --------------------------------------------------
  เก็บ Route หลักทั้งหมดของ MealQ

  ตอนนี้เป็น Route ฝั่ง Customer

  ภายหลังเราจะเพิ่ม Merchant Routes
  ลงในไฟล์เดียวกัน
*/

import { Route, Routes } from "react-router-dom";

// Layout ฝั่งลูกค้า
import CustomerLayout from "../layouts/CustomerLayout";

// Customer Pages
import Home from "../pages/customer/Home";
import Login from "../pages/customer/Login";
import Register from "../pages/customer/Register";
import Restaurants from "../pages/customer/Restaurants";
import RestaurantDetail from "../pages/customer/RestaurantDetail";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";
import Orders from "../pages/customer/Orders";
import OrderDetail from "../pages/customer/OrderDetail";
import Profile from "../pages/customer/Profile";


function AppRoutes() {
  return (
    <Routes>

      {/*
        CustomerLayout จะครอบทุก Route ด้านล่าง

        ทำให้ทุกหน้าใช้ Navbar เดียวกัน
      */}
      <Route element={<CustomerLayout />}>

        {/* หน้าแรก */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Register */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* รายการร้านอาหาร */}
        <Route
          path="/restaurants"
          element={<Restaurants />}
        />

        {/* รายละเอียดร้าน */}
        <Route
          path="/restaurants/:id"
          element={<RestaurantDetail />}
        />

        {/* Cart */}
        <Route
          path="/cart"
          element={<Cart />}
        />

        {/* Checkout */}
        <Route
          path="/checkout"
          element={<Checkout />}
        />

        {/* ประวัติ Order */}
        <Route
          path="/orders"
          element={<Orders />}
        />

        {/* รายละเอียด Order */}
        <Route
          path="/orders/:id"
          element={<OrderDetail />}
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={<Profile />}
        />

      </Route>

    </Routes>
  );
}

export default AppRoutes;