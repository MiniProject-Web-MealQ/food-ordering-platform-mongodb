import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getDashboard } from "@/features/merchant/api";

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard().then((result) => {
      if (result.ok) setData(result.data);
      else setError(result.error.message);
    });
  }, []);

  if (error) return <p>{error} — <Link to="/merchant/login">เข้าสู่ระบบ</Link></p>;
  if (!data) return <p>กำลังโหลด Dashboard...</p>;

  return (
    <div>
      <h1>{data.store.name}</h1>
      <p>{data.store.isOpen ? "เปิดรับออเดอร์" : "ปิดรับออเดอร์"}</p>
      <section>
        <h2>Order Summary</h2>
        <p>New Orders: {data.summary.newOrders}</p>
        <p>Preparing: {data.summary.preparing}</p>
        <p>Completed: {data.summary.completed}</p>
        <p>Menus: {data.summary.menuCount}</p>
      </section>
      <hr />
      <section>
        <h2>Recent Orders</h2>
        {data.recentOrders.length === 0 ? <p>ยังไม่มีออเดอร์</p> : data.recentOrders.map((order) => (
          <p key={order.id}>
            <Link to={`/merchant/orders/${order.orderNumber}`}>#{order.orderNumber}</Link> — {order.status} — ฿{order.totalPrice}
          </p>
        ))}
      </section>
    </div>
  );
}

export default Dashboard;
