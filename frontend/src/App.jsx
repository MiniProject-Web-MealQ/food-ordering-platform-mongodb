/*
  App.jsx
  --------------------------------------------------
  Component หลักของ Frontend

  main.jsx
      ↓
  App.jsx        (สร้าง Router + ScrollRestoration)
      ↓
  AppRoutes.jsx  (Route ทั้งหมดของเว็บไซต์ อยู่ที่ไฟล์นี้ไฟล์เดียว)
      ↓
  Layout / Page ต่าง ๆ
*/
import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from "react-router";
import AppRoutes from "./routes/AppRoutes";

function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

// ทุก URL ส่งต่อให้ AppRoutes เป็นคนเลือกหน้า
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [{ path: "*", element: <AppRoutes /> }],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
