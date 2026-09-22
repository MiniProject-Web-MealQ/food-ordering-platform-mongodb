import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { login } from "@/features/auth/api";

function MerchantLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("merchant@mealq.local");
  const [password, setPassword] = useState("Merchant123!");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await login({ email, password, rememberMe: true, portal: "MERCHANT" });
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    navigate("/merchant/dashboard", { replace: true });
  }

  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: 24 }}>
      <h1>Merchant Login</h1>
      <p>เข้าสู่ระบบร้านค้าเพื่อจัดการเมนูและออเดอร์จาก MongoDB</p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="merchant-email">Email</label>
        <br />
        <input id="merchant-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <br /><br />
        <label htmlFor="merchant-password">Password</label>
        <br />
        <input id="merchant-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <br /><br />
        <button type="submit" disabled={pending}>{pending ? "กำลังเข้าสู่ระบบ..." : "Login"}</button>
      </form>
      <p style={{ marginTop: 16 }}>
        Demo หลังรัน seed: merchant@mealq.local / Merchant123!
      </p>
      <Link to="/register?role=merchant">สมัคร Merchant ใหม่</Link>
    </main>
  );
}

export default MerchantLogin;
