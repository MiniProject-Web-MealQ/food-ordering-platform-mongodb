import { lazy, Suspense } from "react";
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
const CustomerLayout = lazy(() => import("../layouts/CustomerLayout"));

// Layout หลักของฝั่งร้านค้า
// จะมี Sidebar ของ Merchant
const MerchantLayout = lazy(() => import("../layouts/MerchantLayout"));


// ==================================================
// Customer Pages
// ==================================================

// หน้าแรก (Landing) และหน้า Auth ที่ออกแบบแล้ว
// มี Header/Footer ของตัวเอง จึงไม่อยู่ใน CustomerLayout
const HomePage = lazy(() => import("../pages/home"));
const AuthLayout = lazy(() => import("../pages/auth/auth-layout"));
const LoginPage = lazy(() => import("../pages/auth/login"));
const RegisterPage = lazy(() => import("../pages/auth/register"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("../pages/auth/reset-password"));
const CopyOtpPage = lazy(() => import("../pages/auth/copy-otp"));
const DemoPage = lazy(() => import("../pages/demo"));
const NotFoundPage = lazy(() => import("../pages/not-found"));
const InformationPage = lazy(() => import("../pages/information"));

// Layout ย่อยของลูกค้าที่มีแถบเมนูด้านล่าง
const CustomerTabLayout = lazy(() => import("../layouts/CustomerTabLayout"));

const Home = lazy(() => import("../pages/customer/Home"));
const Restaurants = lazy(() => import("../pages/customer/Restaurants"));
const Search = lazy(() => import("../pages/customer/Search"));
const RestaurantDetail = lazy(() => import("../pages/customer/RestaurantDetail"));
const FoodDetail = lazy(() => import("../pages/customer/FoodDetail"));
const Cart = lazy(() => import("../pages/customer/Cart"));
const Checkout = lazy(() => import("../pages/customer/Checkout"));
const Payment = lazy(() => import("../pages/customer/Payment"));
const OrderConfirmed = lazy(() => import("../pages/customer/OrderConfirmed"));
const Orders = lazy(() => import("../pages/customer/Orders"));
const OrderDetail = lazy(() => import("../pages/customer/OrderDetail"));
const Review = lazy(() => import("../pages/customer/Review"));
const RandomFood = lazy(() => import("../pages/customer/RandomFood"));
const Favorites = lazy(() => import("../pages/customer/Favorites"));
const Notifications = lazy(() => import("../pages/customer/Notifications"));
const Profile = lazy(() => import("../pages/customer/Profile"));
const Wallet = lazy(() => import("../pages/customer/Wallet"));
const Coupons = lazy(() => import("../pages/customer/Coupons"));


// ==================================================
// Merchant Pages
// ==================================================

const MerchantLogin = lazy(() => import("../pages/merchant/MerchantLogin"));
const Dashboard = lazy(() => import("../pages/merchant/Dashboard"));
const MerchantOrders = lazy(() => import("../pages/merchant/Orders"));
const MerchantOrderDetail = lazy(() => import("../pages/merchant/OrderDetail"));
const Menu = lazy(() => import("../pages/merchant/Menu"));
const AddMenu = lazy(() => import("../pages/merchant/AddMenu"));
const EditMenu = lazy(() => import("../pages/merchant/EditMenu"));
const Inventory = lazy(() => import("../pages/merchant/Inventory"));
const Settings = lazy(() => import("../pages/merchant/Settings"));


// ==================================================
// Admin Pages (ผู้ดูแลระบบ)
// ==================================================

const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const AdminLogin = lazy(() => import("../pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminStores = lazy(() => import("../pages/admin/Stores"));
const AdminStoreDetail = lazy(() => import("../pages/admin/StoreDetail"));
const AdminUsers = lazy(() => import("../pages/admin/Users"));
const AdminUserDetail = lazy(() => import("../pages/admin/UserDetail"));
const AdminOrders = lazy(() => import("../pages/admin/Orders"));
const AdminOrderDetail = lazy(() => import("../pages/admin/OrderDetail"));
const AdminPromotions = lazy(() => import("../pages/admin/Promotions"));
const AdminWallets = lazy(() => import("../pages/admin/Wallets"));
const AdminReports = lazy(() => import("../pages/admin/Reports"));
const AdminSettings = lazy(() => import("../pages/admin/Settings"));
const AdminActivity = lazy(() => import("../pages/admin/Activity"));
const AdminAccount = lazy(() => import("../pages/admin/Account"));


function AppRoutes() {
  return (
    <Suspense fallback={<main role="status" className="p-8 text-center">กำลังโหลดหน้า…</main>}>
    <Routes>

      {/* หน้าแรก */}
      <Route
        path="/"
        element={<HomePage />}
      />

      <Route path="/help" element={<InformationPage kind="help" />} />
      <Route path="/terms" element={<InformationPage kind="terms" />} />
      <Route path="/privacy" element={<InformationPage kind="privacy" />} />
      <Route path="/copy-otp" element={<CopyOtpPage />} />
      <Route path="/demo" element={<DemoPage />} />


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
          <Route path="wallet" element={<Wallet />} />
          <Route path="coupons" element={<Coupons />} />
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

          URL เดิมของร้านค้าส่งต่อไปหน้า Login ร่วม พร้อมเลือกบทบาทร้านค้า
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


        <Route path="inventory" element={<Inventory />} />
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
    </Suspense>
  );
}

export default AppRoutes;
