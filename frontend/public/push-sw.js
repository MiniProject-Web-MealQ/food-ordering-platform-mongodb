/* global clients */
self.addEventListener("push", (event) => {
  let data; try { data = event.data.json(); } catch { data = { title: "MealQ", body: "มีการอัปเดตออเดอร์" }; }
  event.waitUntil(self.registration.showNotification(data.title || "MealQ", { body: data.body, icon: "/icons/mealq-192.png", tag: data.tag, data: { url: data.url || "/customer/notifications" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/customer/notifications", self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    const client = windows.find((item) => new URL(item.url).origin === url.origin);
    if (client) { await client.navigate(url.href); return client.focus(); }
    return clients.openWindow(url.href);
  }));
});
