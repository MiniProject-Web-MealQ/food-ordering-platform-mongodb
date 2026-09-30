import { Navigate } from "react-router";

/**
 * เก็บ /merchant/menu/new ไว้เป็นลิงก์ตรง: ตอนนี้การเพิ่มเมนูทำใน pop-up บนหน้ารายการเมนู
 * (ดู Menu.jsx) route นี้จึงแค่พาไปเปิด pop-up ที่นั่น
 */
function AddMenu() {
  return <Navigate to="/merchant/menu?new=1" replace />;
}

export default AddMenu;
