import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { createMenu } from "@/features/merchant/api";

function AddMenu() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", price: "", category: "single", description: "" });
  const [error, setError] = useState("");

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    const result = await createMenu({ ...form, price: Number(form.price) });
    if (!result.ok) return setError(result.error.message);
    navigate("/merchant/menu");
  }

  return (
    <div>
      <h1>Add Menu</h1>
      {error && <p>{error}</p>}
      <form onSubmit={submit}>
        <label htmlFor="menu-name">ชื่ออาหาร</label><br />
        <input id="menu-name" value={form.name} onChange={(e) => set("name", e.target.value)} required /><br /><br />
        <label htmlFor="menu-price">ราคา</label><br />
        <input id="menu-price" type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} required /><br /><br />
        <label htmlFor="menu-category">หมวด</label><br />
        <input id="menu-category" value={form.category} onChange={(e) => set("category", e.target.value)} /><br /><br />
        <label htmlFor="menu-description">รายละเอียด</label><br />
        <textarea id="menu-description" value={form.description} onChange={(e) => set("description", e.target.value)} /><br /><br />
        <button type="submit">Save Menu</button>
      </form>
      <br /><Link to="/merchant/menu">กลับไป Menu</Link>
    </div>
  );
}

export default AddMenu;
