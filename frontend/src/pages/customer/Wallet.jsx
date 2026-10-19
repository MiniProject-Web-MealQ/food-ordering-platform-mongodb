import { useCallback, useEffect, useRef, useState } from "react";
import { getWallet, topupWallet } from "@/features/customer/api";
import { PageHeader } from "@/features/customer/components/page-header";
import { formatBaht, formatWhen } from "@/features/customer/format";
import { buttonClasses } from "@/components/ui/styles";
import { usePageTitle } from "@/lib/use-page-title";

export default function Wallet() {
  usePageTitle("MealQ Wallet");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState(false);
  const pending = useRef(null);
  const refresh = useCallback(async () => {
    const result = await getWallet();
    if (result.ok) { setData(result.data); setError(""); }
    else setError(result.error.message);
  }, []);
  useEffect(() => {
    let active = true;
    getWallet().then((result) => {
      if (!active) return;
      if (result.ok) setData(result.data);
      else setError(result.error.message);
    });
    return () => { active = false; };
  }, []);
  async function topup(event) {
    event.preventDefault();
    if (busy || !data?.sandboxTopup) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1 || value > 10000) { setError("กรอกยอดตั้งแต่ 1–10,000 บาท"); return; }
    if (!pending.current || pending.current.amount !== value) pending.current = { amount: value, key: crypto.randomUUID() };
    setBusy(true);
    const result = await topupWallet(value, pending.current.key);
    if (result.ok) { pending.current = null; await refresh(); }
    else setError(result.error.message);
    setBusy(false);
  }
  return <main className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-8 sm:px-6">
    <PageHeader title={data?.sandboxTopup ? "MealQ Wallet (Demo)" : "MealQ Wallet"} fallback="/customer/profile" />
    {error && <p role="alert" className="text-danger">{error} <button className="underline" onClick={refresh}>โหลดใหม่</button></p>}
    {!data ? <p role="status">กำลังโหลดยอด Wallet…</p> : <>
      <section className="rounded-3xl bg-forest p-6 text-white"><p>ยอดคงเหลือ</p><p className="mt-2 text-4xl font-bold">{formatBaht(data.wallet.balance)}</p></section>
      {data.sandboxTopup ? <form onSubmit={topup} className="space-y-3 rounded-3xl bg-cream p-5">
        <h2 className="font-bold">เพิ่มเงิน Demo</h2><p className="text-sm text-ink-soft">เพิ่มยอดได้เองตั้งแต่ 1–10,000 บาทต่อครั้ง ยอดนี้ใช้ทดสอบสั่งอาหารและคืนเงิน ไม่มีการโอนหรือตัดเงินจริง</p>
        <div role="group" aria-label="เลือกจำนวนเงิน Demo" className="flex flex-wrap gap-2">{[100, 300, 500, 1000].map((value) => <button key={value} type="button" disabled={busy} onClick={() => setAmount(String(value))} className="rounded-full border border-haze px-4 py-2 text-sm font-semibold">+{value.toLocaleString("th-TH")} บาท</button>)}</div>
        <label className="block">จำนวนเงิน (บาท)<input type="number" min="1" max="10000" step="0.01" required disabled={busy} value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 block w-full rounded-xl border border-haze p-3" /></label>
        <button disabled={busy} className={buttonClasses({ variant: "cocoa" })}>{busy ? "กำลังเพิ่มยอด…" : "เพิ่มเงิน Demo"}</button>
      </form> : <p className="rounded-3xl bg-cream p-5 text-sm text-ink-soft">ยังไม่เปิดเติมเงินออนไลน์ ติดต่อผู้ดูแลเมื่อต้องการตรวจสอบหรือปรับยอด</p>}
      <section><h2 className="mb-3 text-lg font-bold">รายการล่าสุด</h2>
        {!data.transactions.length ? <p className="text-ink-soft">ยังไม่มีรายการ</p> : <ul className="divide-y divide-haze">{data.transactions.map((tx) => <li key={tx.id} className="flex justify-between gap-4 py-4"><div><p>{tx.description}</p><p className="text-xs text-ink-soft">{formatWhen(new Date(tx.createdAt).getTime())}</p></div><p className="shrink-0 font-bold">{tx.amount > 0 ? "+" : ""}{formatBaht(tx.amount)}</p></li>)}</ul>}
      </section>
    </>}
  </main>;
}
