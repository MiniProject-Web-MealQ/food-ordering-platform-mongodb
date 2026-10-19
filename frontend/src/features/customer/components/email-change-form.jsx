import { useState } from "react";
import { postJson } from "@/lib/api-client";
import { buttonClasses } from "@/components/ui/styles";
import { useCustomer } from "../store";
export function EmailChangeForm() {
  const { state, dispatch } = useCustomer();
  const [email, setEmail] = useState(""); const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function send() {
    setBusy(true); const result = await postJson("/customer/email-change", { email }); setBusy(false);
    if (result.ok) { setChallenge(result.data); setCode(""); setMessage("ส่ง OTP ไปยังอีเมลใหม่แล้ว รหัสมีอายุ 10 นาที"); }
    else setMessage(result.error?.message || "ส่งไม่สำเร็จ");
  }
  async function submit(event) {
    event.preventDefault(); if (busy) return; if (!challenge) return send();
    setBusy(true); const result = await postJson("/customer/email-change/verify", { ticket: challenge.ticket, code }); setBusy(false);
    if (result.ok) { dispatch({ type: "profile/set", user: result.data.user }); setChallenge(null); setEmail(""); setCode(""); setMessage("เปลี่ยนอีเมลและยืนยันแล้ว"); }
    else setMessage(result.error?.message || "ยืนยันไม่สำเร็จ");
  }
  const inputClass = "mt-1 w-full rounded-2xl border border-haze bg-white px-4 py-3";
  return <form onSubmit={submit} className="space-y-3 rounded-3xl bg-cream p-5">
    <h2 className="font-bold">เปลี่ยนอีเมล</h2><p className="text-sm text-ink-soft">อีเมลปัจจุบัน {state.user?.email}</p>
    <label className="block text-sm">อีเมลใหม่<input type="email" required maxLength={254} value={email} disabled={!!challenge} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
    {challenge && <label className="block text-sm">OTP 6 หลัก<input required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={inputClass} /></label>}
    <button disabled={busy} className={buttonClasses({ variant: "cocoa", size: "md" })}>{busy ? "กำลังดำเนินการ…" : challenge ? "ยืนยันและเปลี่ยนอีเมล" : "ส่ง OTP"}</button>
    {challenge && <><button type="button" disabled={busy} onClick={send} className="ml-3 underline">ส่งรหัสใหม่</button><button type="button" disabled={busy} onClick={() => { setChallenge(null); setCode(""); }} className="ml-3 underline">แก้อีเมล</button></>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
