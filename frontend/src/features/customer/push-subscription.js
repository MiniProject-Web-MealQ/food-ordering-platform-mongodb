import { pushPlatform } from "./push-platform.js";

export function supportsPush(browser = globalThis) {
  return pushPlatform(browser).supported;
}

function pushPath(prefix, suffix) {
  if (!["/customer", "/merchant"].includes(prefix)) throw new Error("ประเภทบัญชีแจ้งเตือนไม่ถูกต้อง");
  return `${prefix}/push/${suffix}`;
}

async function existingSubscription(browser) {
  if (!browser.navigator?.serviceWorker) return null;
  const registration = await browser.navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager?.getSubscription()) || null;
}

async function bind(subscription, postJson, prefix) {
  const result = await postJson(pushPath(prefix, "subscribe"), subscription.toJSON());
  if (!result.ok) throw new Error(result.error?.message || "เชื่อมต่อแจ้งเตือนกับบัญชีนี้ไม่สำเร็จ กรุณาลองอีกครั้ง");
}

// Existing permission is reused silently. Only the explicit enable action below
// may ask for permission or create a browser subscription.
export async function reconcileExistingPush({ browser = globalThis, postJson, prefix = "/customer" }) {
  if (!supportsPush(browser) || browser.Notification.permission !== "granted") return false;
  const subscription = await existingSubscription(browser);
  if (!subscription) return false;
  await bind(subscription, postJson, prefix);
  return true;
}

export async function enablePush({ browser = globalThis, getJson, postJson, prefix = "/customer" }) {
  if (!supportsPush(browser)) throw new Error("เบราว์เซอร์นี้ยังไม่รองรับ Web Push");
  if (browser.Notification.permission !== "granted" && await browser.Notification.requestPermission() !== "granted") throw new Error("กรุณาอนุญาตแจ้งเตือนในการตั้งค่าเบราว์เซอร์");
  const registration = await browser.navigator.serviceWorker.register("/push-sw.js");
  await browser.navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const result = await getJson(pushPath(prefix, "key"));
    if (!result.ok || !result.data?.publicKey) throw new Error(result.error?.message || "โหลดการตั้งค่าแจ้งเตือนไม่สำเร็จ");
    const base64 = result.data.publicKey.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(browser.atob(base64 + "=".repeat((4 - base64.length % 4) % 4)), (character) => character.charCodeAt(0));
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  }
  await bind(subscription, postJson, prefix);
  return true;
}

export async function disablePush({ browser = globalThis, postJson, prefix = "/customer" }) {
  const subscription = await existingSubscription(browser);
  if (!subscription) return false;
  const result = await postJson(pushPath(prefix, "unsubscribe"), { endpoint: subscription.endpoint });
  if (!result.ok) throw new Error(result.error?.message || "ปิดแจ้งเตือนอุปกรณ์นี้ไม่สำเร็จ กรุณาลองอีกครั้ง");
  const removed = await subscription.unsubscribe();
  if (!removed && await existingSubscription(browser)) throw new Error("เบราว์เซอร์ยังปิดแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง");
  return false;
}

export async function logoutWithPushCleanup({ browser = globalThis, postJson, prefix = "/customer" }) {
  await disablePush({ browser, postJson, prefix });
  const result = await postJson("/auth/logout", {});
  if (!result.ok) throw new Error(result.error?.message || "ออกจากระบบไม่สำเร็จ");
}
