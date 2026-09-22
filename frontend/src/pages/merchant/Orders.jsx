import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { getOrders } from "@/features/merchant/api";
import { connectSocket } from "@/lib/socket";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await getOrders();
    if (result.ok) {
      setOrders(result.data.orders);
      setError("");
    } else setError(result.error.message);
  }, []);

  useEffect(() => {
    let active = true;
    getOrders().then((result) => {
      if (!active) return;
      if (result.ok) {
        setOrders(result.data.orders);
        setError("");
      } else setError(result.error.message);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let socket;
    connectSocket().then((connected) => {
      socket = connected;
      socket.on("order:new", load);
      socket.on("order:status", load);
    }).catch(() => {});
    return () => socket?.disconnect();
  }, [load]);

  return (
    <div>
      <h1>Merchant Orders</h1>
      {error && <p>{error}</p>}
      <button type="button" onClick={load}>Refresh</button>
      <hr />
      {orders.length === 0 ? <p>ยังไม่มีออเดอร์จากลูกค้า</p> : orders.map((order) => (
        <div key={order.id} style={{ marginBottom: 18 }}>
          <strong>#{order.orderNumber}</strong>
          <p>Customer: {order.customer?.name || "-"}</p>
          <p>Status: {order.status}</p>
          <p>Total: ฿{order.totalPrice}</p>
          <Link to={`/merchant/orders/${order.orderNumber}`}>ดูรายละเอียด</Link>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default Orders;
