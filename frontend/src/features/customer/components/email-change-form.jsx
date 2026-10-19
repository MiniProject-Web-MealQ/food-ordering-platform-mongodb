import { useEffect, useRef, useState } from "react";
import { postJson } from "@/lib/api-client";
import { buttonClasses } from "@/components/ui/styles";
import { useCustomer } from "../store";
export function EmailChangeForm() {
  const { state, dispatch } = useCustomer();
  const [email, setEmail] = useState(""); const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const initialOwner = useRef(state.user?.id);
  const liveOwner = useRef(state.user?.id);
  const userId = state.user?.id;
  useEffect(() => {
    mounted.current = true;
    liveOwner.current = userId;
    return () => { mounted.current = false; };
  }, [userId]);
  const currentAccount = () => mounted.current && Boolean(initialOwner.current) && liveOwner.current === initialOwner.current;
  function failure(text) { setHasError(true); setMessage(text); }
  async function send() {
    if (inFlight.current || !currentAccount()) return;
    inFlight.current = true; setBusy(true); setMessage(""); setHasError(false);
    try {
      const result = await postJson("/customer/email-change", { email: email.trim() });
      if (!currentAccount()) return;
      if (result.ok && typeof result.data?.ticket === "string") {
        setChallenge(result.data); setEmail(result.data.email || email.trim()); setCode(""); setMessage("ส่ง OTP ไปยังอีเมลใหม่แล้ว รหัสมีอายุ 10 นาที");
      } else failure(result.error?.message || "ส่ง OTP ไม่สำเร็จ กรุณาลองอีกครั้ง");
    } catch {
      if (currentAccount()) failure("เชื่อมต่อไม่สำเร็จ กรุณารอสักครู่แล้วลองส่ง OTP อีกครั้ง");
    } finally {
      inFlight.current = false;
      if (currentAccount()) setBusy(false);
    }
  }
  async function submit(event) {
    event.preventDefault(); if (inFlight.current || !currentAccount()) return; if (!challenge) return send();
    inFlight.current = true; setBusy(true); setMessage(""); setHasError(false);
    try {
      const result = await postJson("/customer/email-change/verify", { ticket: challenge.ticket, code });
      if (!currentAccount()) return;
      if (result.ok && result.data?.user?.id === initialOwner.current) {
        dispatch({ type: "profile/set", user: result.data.user }); setChallenge(null); setEmail(""); setCode(""); setMessage("เปลี่ยนอีเมลและยืนยันแล้ว");
      } else failure(result.error?.message || "ยังยืนยันการเปลี่ยนอีเมลไม่ได้ กรุณาตรวจสอบแล้วลองอีกครั้ง");
    } catch {
      if (currentAccount()) failure("เชื่อมต่อไม่สำเร็จ ยังยืนยันการเปลี่ยนอีเมลไม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      inFlight.current = false;
      if (currentAccount()) setBusy(false);
    }
  }
  const inputClass = "mt-1 w-full min-w-0 rounded-2xl border border-haze bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:bg-haze/50";
  return <form onSubmit={submit} aria-busy={busy} className="space-y-3 rounded-3xl bg-cream p-5">
    <h2 className="font-bold">เปลี่ยนอีเมล</h2><p className="break-all text-sm text-ink-soft">อีเมลปัจจุบัน {state.user?.email}</p>
    <label className="block text-sm">อีเมลใหม่<input type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy || !!challenge} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
    {challenge && <label className="block text-sm">OTP 6 หลัก<input required disabled={busy} pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className={inputClass} /></label>}
    <button disabled={busy} className={buttonClasses({ variant: "cocoa", size: "md" })}>{busy ? "กำลังดำเนินการ…" : challenge ? "ยืนยันและเปลี่ยนอีเมล" : "ส่ง OTP"}</button>
    {challenge && <><button type="button" disabled={busy} onClick={send} className="ml-3 underline">ส่งรหัสใหม่</button><button type="button" disabled={busy} onClick={() => { if (inFlight.current) return; setChallenge(null); setCode(""); setMessage(""); setHasError(false); }} className="ml-3 underline">แก้อีเมล</button></>}
    {message && <p role={hasError ? "alert" : "status"} className={`text-sm ${hasError ? "text-danger" : ""}`}>{message}</p>}
  </form>;
}
