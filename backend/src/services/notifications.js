const webpush = require("web-push");
const crypto = require("node:crypto");
const Notification = require("../models/Notification");
const Subscription = require("../models/PushSubscription");
const PushConfig = require("../models/PushConfig");
const CustomerProfile = require("../models/CustomerProfile");
const User = require("../models/User");
const Order = require("../models/Order");
const Store = require("../models/Store");
const orderEmail = require("./order-email");
const { customerOrderEmailContent } = require("./order-email-content");
let config;
async function pushConfig() {
  if (config) return config;
  const keys = webpush.generateVAPIDKeys();
  config = await PushConfig.findByIdAndUpdate("vapid", { $setOnInsert: keys }, { upsert: true, returnDocument: "after" }).select("+privateKey");
  return config;
}
const statusTitles = { pending: "รับคำสั่งซื้อแล้ว", confirmed: "ร้านยืนยันออเดอร์แล้ว", preparing: "ร้านกำลังทำอาหาร", ready: "อาหารพร้อมรับแล้ว", completed: "รับอาหารเรียบร้อย", cancelled: "ออเดอร์ถูกยกเลิก" };
function orderEventTime(order) {
  if (order.status === "completed") return order.receive_time || order.updatedAt;
  if (order.status === "cancelled") return order.cancelled_at || order.updatedAt;
  return order.updatedAt || order.createdAt || order.order_date;
}
function notificationUrl(row) { return row.url || `/${row.recipient_role === "merchant" ? "merchant" : "customer"}/orders/${row.order_id}`; }
function pushSubject() {
  // Apple rejects localhost contact URIs. Use the configured public website
  // origin; changing the subject leaves the existing VAPID key identity intact.
  const candidates = [process.env.PUSH_SUBJECT, String(process.env.FRONTEND_URL || "").split(",")[0], "https://mealq.site"];
  for (const value of candidates) {
    if (!value) continue;
    if (value.startsWith("mailto:") && orderEmail.deliverableEmail(value.slice(7))) return value;
    try {
      const url = new URL(value.trim());
      if (url.protocol === "https:" && !url.username && !url.password && orderEmail.deliverableEmail(`contact@${url.hostname}`)) return url.origin;
    } catch { /* Try the next configured public contact. */ }
  }
  return "https://mealq.site";
}
async function recordOrder(order) {
  if (order.checkout_completed === false) return;
  const events = order.notification_events || [];
  if (!events.length) await recordOrderEvent(order);
  else {
    const snapshot = order.toObject ? order.toObject() : { ...order };
    for (const event of events.slice(0, 6)) {
      await recordOrderEvent({ ...snapshot, status: event.status, updatedAt: event.at,
        payment_status: event.payment_status || snapshot.payment_status,
        cancelled_by: event.cancelled_by || null,
        ...(event.status === "completed" ? { receive_time: event.at } : {}),
        ...(event.status === "cancelled" ? { cancelled_at: event.at } : {}),
      }, { recordPush: event.status === order.status });
    }
    // Mixed-version/legacy writers may have changed status without a journal entry.
    if (!events.some((event) => event.status === order.status)) await recordOrderEvent(order);
  }
  if (order.notification_pending === true) {
    // A newer transition must keep its pending marker. Do not change updatedAt:
    // this acknowledgement is housekeeping, not a new order/payment event.
    await Order.updateOne({ _id: order._id, notification_pending: true, status: order.status,
      $expr: { $eq: [{ $size: { $ifNull: ["$notification_events", []] } }, events.length] },
    }, { $set: { notification_pending: false } }, { timestamps: false });
  }
}
async function recordOrderEvent(order, { recordPush = true } = {}) {
  if (order.checkout_completed === false || !statusTitles[order.status]) return;
  const userId = order.customer_id?._id || order.customer_id;
  const [profile, customer] = await Promise.all([CustomerProfile.findOne({ user_id: userId }), User.findById(userId)]);
  const eventAt = orderEventTime(order);
  const customerUrl = `/customer/orders/${order._id}`;
  const body = `ออเดอร์ ${order.order_number}`;
  if (recordPush && profile?.settings?.notifyReady !== false) {
    await Notification.updateOne({ event_key: `order:${order._id}:${order.status}` }, { $setOnInsert: { user_id: userId, kind: order.status === "pending" ? "paid" : order.status, title: statusTitles[order.status], body, order_id: String(order._id), recipient_role: "customer", url: customerUrl } }, { upsert: true });
  }
  const storeId = order.store_id?._id || order.store_id;
  const store = storeId ? await Store.findById(storeId) : null;
  const successful = ["paid", "simulated", "refunded"].includes(order.payment_status);
  const customerContent = customerOrderEmailContent(order.status);
  if (successful && customerContent) {
    await orderEmail.enqueueOrderEmail({ order, user: customer, role: "customer", event: order.status === "pending" ? "paid" : order.status, eventAt, title: customerContent.title, message: customerContent.message, nextAction: customerContent.nextAction, url: customerUrl, storeName: store?.name || order.store_id?.name || order.store_snapshot?.name || "" });
  }
  const merchantEvent = order.status === "pending" && ["paid", "simulated"].includes(order.payment_status)
    ? { event: "new", title: "มีออเดอร์ใหม่เข้าร้าน" }
    : order.status === "cancelled" && order.cancelled_by === "customer" && successful
      ? { event: "cancelled", title: "ลูกค้ายกเลิกออเดอร์" }
      : order.status === "completed" && successful ? { event: "pickup", title: "ลูกค้ารับอาหารเรียบร้อย" } : null;
  if (!merchantEvent || !store?.owner_id) return;
  const owner = await User.findOne({ _id: store.owner_id, status: "active", role: "merchant" });
  if (!owner) return;
  const watermark = await orderEmail.ensureEmailWatermark();
  if (!eventAt || new Date(eventAt) < watermark.enabled_at) return;
  const merchantUrl = `/merchant/orders/${order._id}`;
  if (recordPush) await Notification.updateOne({ event_key: `order:${order._id}:${order.status}:merchant:${owner._id}` }, { $setOnInsert: { user_id: owner._id, kind: merchantEvent.event, title: merchantEvent.title, body, order_id: String(order._id), recipient_role: "merchant", url: merchantUrl } }, { upsert: true });
  await orderEmail.enqueueOrderEmail({ order, user: owner, role: "merchant", ...merchantEvent, eventAt, message: body, url: merchantUrl, storeName: store.name });
}
let running = false;
async function repairOrders({ limit = 100 } = {}) {
  const pending = await Order.find({ notification_pending: true, checkout_completed: { $ne: false } }).sort({ updatedAt: 1, _id: 1 }).limit(Math.min(Math.max(Number(limit) || 100, 1), 500));
  let failed = 0;
  for (const order of pending) {
    try { await recordOrder(order); }
    catch (error) { failed++; console.error("Order notification repair failed", error.name); }
  }
  return { processed: pending.length, failed };
}
async function deliverPending() {
  if (running) return;
  running = true;
  try {
    // Durable journal work has no age cutoff and makes oldest-first progress even
    // after a long outage. Keep a separate bounded fallback for legacy writers.
    await repairOrders();
    const recent = await Order.find({ notification_pending: { $ne: true }, checkout_completed: { $ne: false },
      updatedAt: { $gte: new Date(Date.now() - 86400000) },
      $expr: { $not: [{ $in: ["$status", { $ifNull: ["$notification_events.status", []] }] }] },
    }).sort({ updatedAt: -1 }).limit(500);
    for (const order of recent) await recordOrder(order);
    const keys = await pushConfig();
    const jobs = await Notification.find({ push_sent: false }).select("+push_delivered_endpoints").sort({ createdAt: 1 }).limit(100);
    for (const job of jobs) {
      const user = await User.findOne({ _id: job.user_id, status: "active" });
      const profile = job.recipient_role === "merchant" ? null : await CustomerProfile.findOne({ user_id: job.user_id });
      if (!user || profile?.settings?.notifyReady === false || (job.recipient_role === "merchant" && user.role !== "merchant")) { await Notification.updateOne({ _id: job._id }, { $set: { push_sent: true } }); continue; }
      const subscriptions = await Subscription.find({ user_id: job.user_id });
      const delivered = new Set(job.push_delivered_endpoints || []);
      let failed = false;
      for (const subscription of subscriptions) {
        // Receipts belong to this event and account; do not copy raw endpoints
        // into the inbox. A different device's retry must not resend this one.
        const receipt = crypto.createHash("sha256").update(`${job.user_id}\0${subscription.endpoint}`).digest("hex");
        if (delivered.has(receipt)) continue;
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys.toObject() }, JSON.stringify({ title: job.title, body: job.body, tag: job.event_key, url: notificationUrl(job) }), { vapidDetails: { subject: pushSubject(), publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 3600, timeout: 5000 });
          await Notification.updateOne({ _id: job._id, user_id: job.user_id }, { $addToSet: { push_delivered_endpoints: receipt } });
          delivered.add(receipt);
        } catch (error) {
          if ([404, 410].includes(error.statusCode)) await Subscription.deleteOne({ _id: subscription._id });
          else failed = true;
        }
      }
      if (!failed) await Notification.updateOne({ _id: job._id }, { $set: { push_sent: true } });
    }
  } finally { running = false; }
}
const notificationView = (row) => ({ id: String(row._id), kind: row.kind, title: row.title, body: row.body, orderId: row.order_id, url: notificationUrl(row), at: row.createdAt.getTime(), read: row.read });
async function list(req, res) { const rows = await Notification.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(100); res.json({ notifications: rows.map(notificationView) }); }
async function read(req, res) { const filter = { user_id: req.user._id }; if (req.params.id !== "all") { if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(400); filter._id = req.params.id; } await Notification.updateMany(filter, { $set: { read: true } }); res.json({ ok: true }); }
async function publicKey(_req, res) { res.json({ publicKey: (await pushConfig()).publicKey }); }
function validEndpoint(value) {
  try { const url = new URL(value); return value.length <= 3000 && url.protocol === "https:" && !url.username && !url.password && !url.port && ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname); } catch { return false; }
}
async function subscribe(req, res) {
  const { endpoint, keys } = req.body || {};
  if (!validEndpoint(endpoint) || typeof keys?.p256dh !== "string" || !/^[A-Za-z0-9_-]{86,88}$/.test(keys.p256dh) || typeof keys?.auth !== "string" || !/^[A-Za-z0-9_-]{22,24}$/.test(keys.auth)) return res.status(400).json({ error: { code: "INVALID_SUBSCRIPTION", message: "ข้อมูลแจ้งเตือนไม่ถูกต้องหรือไม่รองรับบริการเบราว์เซอร์นี้" } });
  await Subscription.findOneAndUpdate({ endpoint }, { $set: { user_id: req.user._id, keys } }, { upsert: true });
  res.status(201).json({ ok: true });
}
async function unsubscribe(req, res) { await Subscription.deleteOne({ endpoint: req.body?.endpoint, user_id: req.user._id }); res.json({ ok: true }); }
module.exports = { pushConfig, pushSubject, recordOrder, repairOrders, deliverPending, list, read, publicKey, subscribe, unsubscribe, validEndpoint };
