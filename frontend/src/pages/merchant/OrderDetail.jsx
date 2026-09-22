import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getOrder, setOrderStatus } from "@/features/merchant/api";

const STATUSES = ["confirmed", "preparing", "ready", "completed", "cancelled"];

function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    getOrder(id).then((result) => {
      if (!active) return;
      if (result.ok) setOrder(result.data.order);
      else setError(result.error.message);
    });
    return () => { active = false; };
  }, [id]);

  async function changeStatus(status) {
    setPending(true);
    const result = await setOrderStatus(id, status);
    setPending(false);
    if (result.ok) {
      setOrder(result.data.order);
      setError("");
    } else setError(result.error.message);
  }

  if (error && !order) return <p>{error}</p>;
  if (!order) return <p>กำลังโหลดออเดอร์...</p>;

  return (
    <div>
      <h1>Order #{order.orderNumber}</h1>
      <p>Customer: {order.customer?.name} ({order.customer?.email})</p>
      <h3>Status: {order.status}</h3>
      <p>Queue: #{order.queueNumber ?? "-"} / Pickup code: {order.pickupCode ?? "-"}</p>
      <hr />
      <h3>Items</h3>
      {order.items.map((item, index) => (
        <p key={`${item.menuId}-${index}`}>{item.name} × {item.quantity} — ฿{item.totalPrice}</p>
      ))}
      <strong>Total: ฿{order.totalPrice}</strong>
      <hr />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {STATUSES.map((status) => (
          <button key={status} type="button" disabled={pending || order.status === status} onClick={() => changeStatus(status)}>
            {status}
          </button>
        ))}
      </div>
      {error && <p>{error}</p>}
      <br />
      <Link to="/merchant/orders">กลับไป Orders</Link>
    </div>
  );
}

export default OrderDetail;
