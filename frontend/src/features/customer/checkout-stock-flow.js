/**
 * A fresh checkout must pass stock and session checks before its retry receipt is
 * marked submitted. An uncertain/submitted checkout instead replays the original
 * request: its first attempt may already have reserved the remaining ingredients.
 */
export async function submitStockCheckedOrder({ alreadySubmitted = false, ownerId, isActive, isOwner, checkStock, verifySession, markSubmitted, createOrder, onPhase = () => {} }) {
  let requestSubmitted = alreadySubmitted === true;
  const authError = () => ({ ok: false, preflight: !requestSubmitted, error: { code: "AUTH_REQUIRED", message: "บัญชีที่เข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบและตรวจสอบตะกร้าใหม่" } });
  function stopped() {
    if (!isActive()) return { cancelled: true };
    return !ownerId || !isOwner() ? authError() : null;
  }
  try {
    let stop = stopped();
    if (stop) return stop;
    if (!requestSubmitted) {
      onPhase("checking-stock");
      const stock = await checkStock();
      stop = stopped();
      if (stop) return stop;
      if (!stock?.ok || stock.data?.available !== true) {
        return {
          ok: false, preflight: true, status: stock?.status,
          error: stock?.error || { code: "STOCK_CHECK_FAILED", message: "ยังยืนยันสต็อกอาหารไม่ได้ กรุณาลองใหม่หรือตรวจสอบตะกร้าก่อนชำระเงิน" },
        };
      }
    }
    // Recheck the server session after preflight, rather than trusting a stale tab.
    const session = await verifySession();
    stop = stopped();
    if (stop) return stop;
    if (!session?.ok) {
      return { ok: false, preflight: !requestSubmitted, error: session?.error || { code: "NETWORK_ERROR", message: "ยังตรวจสอบบัญชีไม่ได้ กรุณาลองใหม่อีกครั้ง" } };
    }
    if (session.data?.user?.id !== ownerId) return authError();
    stop = stopped();
    if (stop) return stop;
    onPhase(requestSubmitted ? "recovering-order" : "sending-order");
    if (!requestSubmitted) {
      markSubmitted();
      requestSubmitted = true;
    }
    const response = await createOrder();
    stop = stopped();
    if (stop) return stop;
    return { ...response, preflight: false };
  } catch {
    const stop = stopped();
    if (stop) return stop;
    return {
      ok: false, preflight: !requestSubmitted,
      error: { code: "NETWORK_ERROR", message: requestSubmitted ? "ยังเชื่อมต่อเพื่อยืนยันผลคำสั่งซื้อไม่ได้ กรุณาตรวจสอบคำขอเดิมอีกครั้ง" : "ยังตรวจสอบสต็อกและบัญชีไม่ได้ กรุณาลองใหม่ก่อนชำระเงิน" },
    };
  }
}
