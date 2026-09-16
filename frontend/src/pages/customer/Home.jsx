import { Link } from "react-router";

function Home() {
  return (
    <div>
      {/* ชื่อหน้าปัจจุบัน */}
      <h2>Home</h2>

      {/* ข้อความชั่วคราวสำหรับหน้าแรก */}
      <p>Welcome to MealQ</p>

      {/*
        Link ไปหน้ารายการร้านอาหาร
        ภายหลังสามารถเปลี่ยนเป็นปุ่มสวย ๆ ได้
      */}
      <Link to="/restaurants">
        ดูร้านอาหาร
      </Link>
    </div>
  );
}

export default Home;