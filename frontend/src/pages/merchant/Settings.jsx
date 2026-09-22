import { useEffect, useState } from "react";
import { getStore, updateStore } from "@/features/merchant/api";

function Settings() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getStore().then((result) => {
      if (result.ok) {
        const store = result.data.store;
        setForm({ name: store.name, description: store.description || "", phone: store.phone || "", isOpen: store.isOpen });
      } else setMessage(result.error.message);
    });
  }, []);

  function set(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event) {
    event.preventDefault();
    const result = await updateStore(form);
    setMessage(result.ok ? "บันทึกแล้ว" : result.error.message);
  }

  if (!form) return <p>{message || "กำลังโหลดข้อมูลร้าน..."}</p>;

  return (
    <div>
      <h1>Store Settings</h1>
      <form onSubmit={submit}>
        <label>Store Name</label><br /><input value={form.name} onChange={(e) => set("name", e.target.value)} /><br /><br />
        <label>Description</label><br /><textarea value={form.description} onChange={(e) => set("description", e.target.value)} /><br /><br />
        <label>Phone</label><br /><input value={form.phone} onChange={(e) => set("phone", e.target.value)} /><br /><br />
        <label><input type="checkbox" checked={form.isOpen} onChange={(e) => set("isOpen", e.target.checked)} /> เปิดรับ Order</label><br /><br />
        <button type="submit">Save Settings</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default Settings;
