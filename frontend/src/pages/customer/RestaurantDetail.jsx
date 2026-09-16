import { Link, useParams } from "react-router";

function RestaurantDetail() {
  /*
    useParams ใช้อ่านค่าที่อยู่ใน URL

    ตัวอย่าง:
    /restaurants/1
    id จะมีค่าเป็น "1"

    /restaurants/2
    id จะมีค่าเป็น "2"
  */
  const { id } = useParams();

  return (
    <div>
      <h2>Restaurant Detail</h2>

      {/* ตอนนี้แสดง ID เพื่อทดสอบว่า Dynamic Route ทำงาน */}
      <p>Restaurant ID: {id}</p>

      <h3>Menu</h3>

      {/* เมนูจำลอง */}
      <p>กะเพราไก่ - 60 บาท</p>
      <p>ข้าวผัด - 55 บาท</p>
      <p>ไข่ดาว - 15 บาท</p>

      {/* ตอนนี้ยังไม่ได้ทำระบบเพิ่ม Cart จริง */}
      <Link to="/cart">
        ไปตะกร้า
      </Link>
    </div>
  );
}

export default RestaurantDetail;