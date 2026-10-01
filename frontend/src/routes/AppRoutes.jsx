/*
  AppRoutes.jsx
  --------------------------------------------------
  ไฟล์นี้ใช้เก็บ Route หลักทั้งหมดของ MealQ

  แบ่งออกเป็น:

  0. Home (Landing) และ Auth
     - Login
     - Register
     - Forgot Password
     - Reset Password

  1. Customer (/customer/...)
     - Home, Explore, Search
     - Restaurant, Food detail
     - Cart, Checkout, Payment
     - Orders, Order tracking, Order confirmed, Review
     - Random food, Favorites, Notifications, Profile

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
} from "react-router";


// ==================================================
// Layouts
// ==================================================

// Layout หลักของฝั่งลูกค้า
import CustomerLayout from "../layouts/CustomerLayout";

// Layout หลักของฝั่งร้านค้า
// จะมี Sidebar ของ Merchant
import MerchantLayout from "../layouts/MerchantLayout";


// ==================================================
// Customer Pages
// ==================================================

// หน้าแรก (Landing) และหน้า Auth ที่ออกแบบแล้ว
// มี Header/Footer ของตัวเอง จึงไม่อยู่ใน CustomerLayout
import HomePage from "../pages/home";
import AuthLayout from "../pages/auth/auth-layout";
import LoginPage from "../pages/auth/login";
import RegisterPage from "../pages/auth/register";
import ForgotPasswordPage from "../pages/auth/forgot-password";
import ResetPasswordPage from "../pages/auth/reset-password";
import NotFoundPage from "../pages/not-found";

// Layout ย่อยของลูกค้าที่มีแถบเมนูด้านล่าง
import CustomerTabLayout from "../layouts/CustomerTabLayout";

import Home from "../pages/customer/Home";
import Restaurants from "../pages/customer/Restaurants";
import Search from "../pages/customer/Search";
import RestaurantDetail from "../pages/customer/RestaurantDetail";
import FoodDetail from "../pages/customer/FoodDetail";
import Cart from "../pages/customer/Cart";
import Checkout from "../pages/customer/Checkout";
import Payment from "../pages/customer/Payment";
import OrderConfirmed from "../pages/customer/OrderConfirmed";
import Orders from "../pages/customer/Orders";
import OrderDetail from "../pages/customer/OrderDetail";
import Review from "../pages/customer/Review";
import RandomFood from "../pages/customer/RandomFood";
import Favorites from "../pages/customer/Favorites";
import Notifications from "../pages/customer/Notifications";
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


// ==================================================
// Admin Pages (ผู้ดูแลระบบ · ตอนนี้ใช้ข้อมูลจำลอง)
// ==================================================

import AdminLayout from "../layouts/AdminLayout";
import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminStores from "../pages/admin/Stores";
import AdminStoreDetail from "../pages/admin/StoreDetail";
import AdminUsers from "../pages/admin/Users";
import AdminUserDetail from "../pages/admin/UserDetail";
import AdminOrders from "../pages/admin/Orders";
import AdminOrderDetail from "../pages/admin/OrderDetail";
import AdminPromotions from "../pages/admin/Promotions";
import AdminWallets from "../pages/admin/Wallets";
import AdminReports from "../pages/admin/Reports";
import AdminSettings from "../pages/admin/Settings";
import AdminActivity from "../pages/admin/Activity";
import AdminAccount from "../pages/admin/Account";


function AppRoutes() {
  return (
    <Routes>

      {/* หน้าแรก */}
      <Route
        path="/"
        element={<HomePage />}
      />


      {/* ==================================================
          AUTH ROUTES
          ==================================================

          Login / Register / ลืมรหัสผ่าน / ตั้งรหัสผ่านใหม่
          ใช้ AuthLayout ร่วมกัน
      */}

      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={<LoginPage />}
        />
        <Route
          path="/register"
          element={<RegisterPage />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
      </Route>


      {/* ==================================================
          CUSTOMER ROUTES
          ==================================================

          ทุกหน้าของลูกค้าอยู่ใต้ /customer
          (เหมือนฝั่งร้านค้าที่อยู่ใต้ /merchant)

          CustomerLayout      -> ครอบ state ตะกร้า/ออเดอร์ + กรอบแอปมือถือ
          CustomerTabLayout   -> หน้าที่มีแถบเมนูด้านล่าง
      */}

      <Route path="/customer" element={<CustomerLayout />}>

        {/* หน้าที่มีแถบเมนูด้านล่าง */}
        <Route element={<CustomerTabLayout />}>
          <Route index element={<Home />} />
          <Route path="explore" element={<Restaurants />} />
          <Route path="search" element={<Search />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="random" element={<RandomFood />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* หน้าที่มีปุ่มด้านล่างของตัวเอง (ไม่มีแถบเมนู) */}
        <Route path="restaurants/:id" element={<RestaurantDetail />} />
        <Route path="restaurants/:id/menu/:menuId" element={<FoodDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="checkout/payment" element={<Payment />} />
        <Route path="orders/:id/confirmed" element={<OrderConfirmed />} />
        <Route path="orders/:id/review" element={<Review />} />
        <Route path="favorites" element={<Favorites />} />

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
          ADMIN ROUTES
          ==================================================

          ผู้ดูแลระบบอยู่ใต้ /admin
          หน้า login แยกจาก AdminLayout (ไม่มี sidebar)
      */}

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="stores" element={<AdminStores />} />
        <Route path="stores/:id" element={<AdminStoreDetail />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="promotions" element={<AdminPromotions />} />
        <Route path="wallets" element={<AdminWallets />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="account" element={<AdminAccount />} />
      </Route>


      {/* ==================================================
          NOT FOUND
          ==================================================

          ถ้าผู้ใช้พิมพ์ URL ที่ไม่มีอยู่ในระบบ

          ตัวอย่าง:
          /abcdef
          /hello

          ให้แสดงหน้า 404 (มีปุ่มกลับหน้า Home)
      */}

      <Route
        path="*"
        element={<NotFoundPage />}
      />

    </Routes>
  );
}

export default AppRoutes;