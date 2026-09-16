/*
  AppRoutes.jsx
  --------------------------------------------------
  ไฟล์นี้ใช้เก็บ Route หลักทั้งหมดของ MealQ

  แบ่งออกเป็น 2 ฝั่งหลัก:

  1. Customer
     - Home
     - Login
     - Register
     - Restaurants
     - Restaurant Detail
     - Cart
     - Checkout
     - Orders
     - Order Detail
     - Profile

  2. Merchant
     - Merchant Login
     - Dashboard
     - Orders
     - Order Detail
     - Menu Management
     - Add Menu
     - Edit Menu
     - Settings
*/

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";


// ==================================================
// Layouts
// ==================================================

// Layout หลักของฝั่งลูกค้า
// จะมี Navbar ของ Customer
import CustomerLayout from "../layouts/CustomerLayout";

// Layout หลักของฝั่งร้านค้า
// จะมี Sidebar ของ Merchant
import MerchantLayout from "../layouts/MerchantLayout";


// ==================================================
// Customer Pages
// ==================================================

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


// ==================================================
// Merchant Pages
// ==================================================

import MerchantLogin from "../pages/merchant/MerchantLogin";
import Dashboard from "../pages/merchant/Dashboard";
import MerchantOrders from "../pages/merchant/Orders";
import MerchantOrderDetail from "../pages/merchant/OrderDetail";
import Menu from "../pages/merchant/Menu";
import AddMenu from "../pages/merchant/AddMenu";
import EditMenu from "../pages/merchant/EditMenu";
import Settings from "../pages/merchant/Settings";


function AppRoutes() {
  return (
    <Routes>

      {/* ==================================================
          CUSTOMER ROUTES
          ==================================================

          Route ทั้งหมดที่อยู่ด้านใน CustomerLayout
          จะใช้ Navbar ฝั่งลูกค้าร่วมกัน

          ตัวอย่าง:

          /
          /restaurants
          /cart
          /orders
          /profile

          หน้าแต่ละหน้าจะถูกแสดงตรง <Outlet />
          ภายใน CustomerLayout.jsx
      */}

      <Route element={<CustomerLayout />}>

        {/* หน้าแรก */}
        <Route
          path="/"
          element={<Home />}
        />


        {/* หน้า Login ของลูกค้า */}
        <Route
          path="/login"
          element={<Login />}
        />


        {/* หน้าสมัครสมาชิก */}
        <Route
          path="/register"
          element={<Register />}
        />


        {/* หน้ารายการร้านอาหาร */}
        <Route
          path="/restaurants"
          element={<Restaurants />}
        />


        {/*
          หน้ารายละเอียดร้านอาหาร

          :id คือ Dynamic Parameter

          ตัวอย่าง:
          /restaurants/1
          /restaurants/2
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


        {/* หน้ายืนยันคำสั่งซื้อ */}
        <Route
          path="/checkout"
          element={<Checkout />}
        />


        {/* หน้าประวัติ Order ของลูกค้า */}
        <Route
          path="/orders"
          element={<Orders />}
        />


        {/*
          หน้ารายละเอียด Order

          ตัวอย่าง:
          /orders/1001
          /orders/1002
      */}
        <Route
          path="/orders/:id"
          element={<OrderDetail />}
        />


        {/* หน้า Profile */}
        <Route
          path="/profile"
          element={<Profile />}
        />

      </Route>


      {/* ==================================================
          MERCHANT LOGIN
          ==================================================

          หน้า Login ของร้านค้าจะแยกจาก MerchantLayout

          เพราะหน้า Login ยังไม่ต้องแสดง Sidebar
      */}

      <Route
        path="/merchant/login"
        element={<MerchantLogin />}
      />


      {/* ==================================================
          MERCHANT ROUTES
          ==================================================

          Route ด้านในทั้งหมดจะใช้ MerchantLayout

          MerchantLayout จะมี Sidebar เช่น:

          Dashboard
          Orders
          Menu
          Settings

          และหน้าปัจจุบันจะถูกแสดงตรง <Outlet />
      */}

      <Route
        path="/merchant"
        element={<MerchantLayout />}
      >

        {/*
          ถ้าเปิด:

          /merchant

          ให้ Redirect ไป:

          /merchant/dashboard
      */}
        <Route
          index
          element={
            <Navigate
              to="/merchant/dashboard"
              replace
            />
          }
        />


        {/* Merchant Dashboard */}
        <Route
          path="dashboard"
          element={<Dashboard />}
        />


        {/* รายการ Order ของร้าน */}
        <Route
          path="orders"
          element={<MerchantOrders />}
        />


        {/*
          รายละเอียด Order

          ตัวอย่าง:
          /merchant/orders/1001
      */}
        <Route
          path="orders/:id"
          element={<MerchantOrderDetail />}
        />


        {/* หน้าจัดการเมนูอาหาร */}
        <Route
          path="menu"
          element={<Menu />}
        />


        {/* หน้าเพิ่มเมนูอาหาร */}
        <Route
          path="menu/new"
          element={<AddMenu />}
        />


        {/*
          หน้าแก้ไขเมนู

          ตัวอย่าง:
          /merchant/menu/1/edit
      */}
        <Route
          path="menu/:id/edit"
          element={<EditMenu />}
        />


        {/* หน้าตั้งค่าร้าน */}
        <Route
          path="settings"
          element={<Settings />}
        />

      </Route>


      {/* ==================================================
          NOT FOUND
          ==================================================

          ถ้าผู้ใช้พิมพ์ URL ที่ไม่มีอยู่ในระบบ

          ตัวอย่าง:
          /abcdef
          /hello

          ให้ Redirect กลับหน้า Home
      */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}

export default AppRoutes;