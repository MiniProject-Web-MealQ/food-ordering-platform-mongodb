import { Navigate, useParams } from "react-router";

/**
 * เก็บ /merchant/menu/:id/edit ไว้เป็นลิงก์ตรง: ตอนนี้การแก้ไขเมนูทำใน pop-up บนหน้ารายการเมนู
 * (ดู Menu.jsx) route นี้จึงแค่พาไปเปิด pop-up ที่นั่น
 */
function EditMenu() {
  const { id } = useParams();
  return <Navigate to={`/merchant/menu?edit=${encodeURIComponent(id)}`} replace />;
}

export default EditMenu;
