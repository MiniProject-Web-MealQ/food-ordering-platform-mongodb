import { useEffect, useState } from "react";
import { Link } from "react-router";
import { deleteMenu, getMenus, updateMenu } from "@/features/merchant/api";

function Menu() {
  const [menus, setMenus] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const result = await getMenus();
    if (result.ok) setMenus(result.data.menus);
    else setError(result.error.message);
  }

  useEffect(() => {
    let active = true;
    getMenus().then((result) => {
      if (!active) return;
      if (result.ok) setMenus(result.data.menus);
      else setError(result.error.message);
    });
    return () => { active = false; };
  }, []);

  async function toggle(menu) {
    await updateMenu(menu.id, { isAvailable: !menu.isAvailable });
    load();
  }

  async function remove(menu) {
    if (!window.confirm(`ลบเมนู ${menu.name}?`)) return;
    await deleteMenu(menu.id);
    load();
  }

  return (
    <div>
      <h1>Menu Management</h1>
      <Link to="/merchant/menu/new">+ เพิ่มเมนูอาหาร</Link>
      {error && <p>{error}</p>}
      <hr />
      {menus.length === 0 ? <p>ยังไม่มีเมนู</p> : menus.map((menu) => (
        <div key={menu.id} style={{ marginBottom: 16 }}>
          <h3>{menu.name}</h3>
          <p>ราคา: {menu.price} บาท</p>
          <p>Status: {menu.isAvailable ? "Available" : "Unavailable"}</p>
          <Link to={`/merchant/menu/${menu.id}/edit`}>แก้ไข</Link>{" "}
          <button type="button" onClick={() => toggle(menu)}>{menu.isAvailable ? "ปิดขาย" : "เปิดขาย"}</button>{" "}
          <button type="button" onClick={() => remove(menu)}>ลบ</button>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default Menu;
