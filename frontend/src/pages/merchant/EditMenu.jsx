import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getMenu, updateMenu } from "@/features/merchant/api";

function EditMenu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMenu(id).then((result) => {
      if (result.ok) {
        const menu = result.data.menu;
        setForm({ name: menu.name, price: String(menu.price), category: menu.category, description: menu.description, isAvailable: menu.isAvailable });
      } else setError(result.error.message);
    });
  }, [id]);

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    const result = await updateMenu(id, { ...form, price: Number(form.price) });
    if (!result.ok) return setError(result.error.message);
    navigate("/merchant/menu");
  }

  if (!form) return <p>{error || "กำลังโหลดเมนู..."}</p>;

  return (
    <div>
      <h1>Edit Menu</h1>
      {error && <p>{error}</p>}
      <form onSubmit={submit}>
        <label>ชื่ออาหาร</label><br /><input value={form.name} onChange={(e) => set("name", e.target.value)} /><br /><br />
        <label>ราคา</label><br /><input type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} /><br /><br />
        <label>หมวด</label><br /><input value={form.category} onChange={(e) => set("category", e.target.value)} /><br /><br />
        <label>รายละเอียด</label><br /><textarea value={form.description} onChange={(e) => set("description", e.target.value)} /><br /><br />
        <label><input type="checkbox" checked={form.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} /> เปิดขาย</label><br /><br />
        <button type="submit">Save Changes</button>
      </form>
      <br /><Link to="/merchant/menu">กลับไป Menu</Link>
    </div>
  );
}

export default EditMenu;
