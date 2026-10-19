export function pushPlatform(browser = globalThis) {
  const navigator = browser.navigator || {};
  const userAgent = navigator.userAgent || "";
  const ios = /iPad|iPhone|iPod/i.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || browser.matchMedia?.("(display-mode: standalone)")?.matches === true;
  const version = userAgent.match(/(?:CPU(?: iPhone)? OS|iPhone OS) (\d+)[._](\d+)/i);
  const oldIOS = ios && !!version && (Number(version[1]) < 16 || (Number(version[1]) === 16 && Number(version[2]) < 4));
  const apiSupport = !!(browser.isSecureContext && navigator.serviceWorker && browser.PushManager && browser.Notification);
  return { ios, standalone, oldIOS, android: /Android/i.test(userAgent), supported: apiSupport && !oldIOS && (!ios || standalone), needsInstall: ios && !standalone && !oldIOS };
}
