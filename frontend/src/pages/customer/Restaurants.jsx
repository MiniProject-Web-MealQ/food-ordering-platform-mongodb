import { Link } from "react-router-dom";

function Restaurants() {
  return (
    <div>
      <h2>Restaurants</h2>

      <p>รายการร้านอาหารทั้งหมด</p>

      {/* ข้อมูลร้านอาหารจำลองสำหรับทดสอบ Routing */}
      <div>
        <h3>MealQ Kitchen</h3>
        <p>อาหารตามสั่ง</p>

        {/*
          ภายหลัง /restaurants/1
          จะเป็นหน้ารายละเอียดของร้าน ID 1
        */}
        <Link to="/restaurants/1">
          ดูร้าน
        </Link>
      </div>

      <hr />

      <div>
        <h3>Pizza House</h3>
        <p>Pizza</p>

        <Link to="/restaurants/2">
          ดูร้าน
        </Link>
      </div>
    </div>
  );
}

export default Restaurants;