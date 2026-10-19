const crypto = require("node:crypto");
const User = require("../models/User");
const Outbox = require("../models/EmailOutbox");
const State = require("../models/EmailNotificationState");
const mail = require("./mail");
const { sendError } = require("../utils/http");

const MAX_ATTEMPTS = 5;
const LEASE_MS = 120000;
const RETRY_MS = [30000, 120000, 600000, 1800000];
const STATE_ID = "order-email-v1";

function deliverableEmail(value) {
  if (typeof value !== "string" || value.length > 254 || !/^[^\s<>(),;:\[\]"@]+@[^\s<>(),;:\[\]"@]+\.[^\s<>(),;:\[\]"@]+$/.test(value)) return false;
  const domain = value.slice(value.lastIndexOf("@") + 1).toLowerCase();
  return !/(?:^|\.)(?:invalid|local|localhost|test|example)$/.test(domain) && !/(?:^|\.)example\.(?:com|net|org)$/.test(domain) && !/^\d+(?:\.\d+)+$/.test(domain);
}

function eligibleUser(user) {
  return Boolean(user && user.status === "active" && ["customer", "merchant"].includes(user.role) && user.email_verified_at && deliverableEmail(user.email));
}

async function ensureEmailWatermark(now = new Date()) {
  try {
    return await State.findOneAndUpdate({ _id: STATE_ID }, { $setOnInsert: { enabled_at: now } }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return State.findById(STATE_ID);
  }
}

function preferenceView(user) {
  return {
    emailOrders: user.email_order_notifications === true,
    emailVerified: Boolean(user.email_verified_at),
    emailAvailable: Boolean(mail.mailConfigured() && deliverableEmail(user.email) && ["customer", "merchant"].includes(user.role)),
  };
}

async function getPreferences(req, res) { return res.json(preferenceView(req.user)); }

async function updatePreferences(req, res) {
  const enabled = req.body?.emailOrders;
  if (typeof enabled !== "boolean") return sendError(res, 400, "INVALID_NOTIFICATION_PREFERENCES", "กรุณาระบุการรับอีเมลเป็น true หรือ false");
  if (enabled) {
    if (!["customer", "merchant"].includes(req.user.role)) return sendError(res, 403, "EMAIL_ROLE_UNSUPPORTED", "การแจ้งเตือนอีเมลนี้รองรับบัญชีลูกค้าและเจ้าของร้าน");
    if (!req.user.email_verified_at) return sendError(res, 400, "EMAIL_NOT_VERIFIED", "กรุณายืนยันอีเมลของบัญชีก่อนเปิดรับอีเมลออเดอร์");
    if (!deliverableEmail(req.user.email)) return sendError(res, 400, "EMAIL_UNDELIVERABLE", "กรุณาใช้อีเมลจริงที่รับข้อความได้ก่อนเปิดการแจ้งเตือน");
    if (!mail.mailConfigured()) return sendError(res, 503, "EMAIL_UNAVAILABLE", "ระบบส่งอีเมลยังไม่พร้อม กรุณาลองอีกครั้งภายหลัง");
    await ensureEmailWatermark();
  }
  // Conditional updates keep simultaneous identical PATCH requests from resetting
  // the opt-in watermark/generation and hiding a newly queued legitimate event.
  if (enabled) {
    await User.updateOne({ _id: req.user._id, $or: [{ email_order_notifications: { $ne: true } }, { email_order_generation: null }, { email_order_enabled_at: null }] }, {
      $set: { email_order_notifications: true, email_order_enabled_at: new Date(), email_order_generation: crypto.randomUUID() },
    });
  } else {
    await User.updateOne({ _id: req.user._id }, { $set: { email_order_notifications: false, email_order_enabled_at: null, email_order_generation: null } });
    await Outbox.updateMany({ user_id: req.user._id, status: "pending" }, { $set: { status: "skipped", last_error_code: "OPTED_OUT" } });
  }
  return res.json(preferenceView(await User.findById(req.user._id)));
}

async function enqueueOrderEmail({ order, user, role, event, eventAt, title, message, url, storeName = "" }) {
  if (!eligibleUser(user) || user.role !== role || user.email_order_notifications !== true || !user.email_order_generation || !user.email_order_enabled_at) return null;
  const at = new Date(eventAt);
  if (!Number.isFinite(at.getTime())) return null;
  const state = await ensureEmailWatermark();
  if (at < state.enabled_at || at < user.email_order_enabled_at) return null;
  const eventKey = `order:${order._id}:${order.status}:email:${role}:${user._id}`;
  const payload = {
    recipientName: String(user.name || "").slice(0, 120), title, message, url, event,
    orderNumber: String(order.order_number || "").slice(0, 100), storeName: String(storeName).slice(0, 200),
    total: Number(order.total_price || 0),
    items: (order.items || []).slice(0, 100).map((item) => ({ name: String(item.name).slice(0, 200), quantity: Number(item.quantity), totalPrice: Number(item.total_price || 0) })),
  };
  try {
    return await Outbox.findOneAndUpdate({ event_key: eventKey }, { $setOnInsert: {
      user_id: user._id, order_id: order._id, role, event, event_at: at,
      preference_generation: user.email_order_generation, to: user.email, payload,
      status: "pending", attempts: 0, available_at: new Date(),
    } }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Outbox.findOne({ event_key: eventKey });
  }
}

async function deliverOrderEmails({ limit = 10, now } = {}) {
  const clock = typeof now === "function" ? () => new Date(now()) : now ? () => new Date(now) : () => new Date();
  let at = clock();
  if (!mail.mailConfigured()) return { processed: 0 };
  await Outbox.updateMany({ status: { $in: ["pending", "sending"] }, attempts: { $gte: MAX_ATTEMPTS }, $or: [{ lease_until: null }, { lease_until: { $lte: at } }] }, { $set: { status: "failed", lease_id: null, lease_until: null, last_error_code: "RETRY_EXHAUSTED" } });
  let processed = 0;
  while (processed < Math.min(Math.max(Number(limit) || 10, 1), 100)) {
    at = clock();
    const lease = crypto.randomUUID();
    const job = await Outbox.findOneAndUpdate({ status: { $in: ["pending", "sending"] }, available_at: { $lte: at }, attempts: { $lt: MAX_ATTEMPTS }, $or: [{ lease_until: null }, { lease_until: { $lte: at } }] }, {
      $set: { status: "sending", lease_id: lease, lease_until: new Date(at.getTime() + LEASE_MS) }, $inc: { attempts: 1 },
    }, { sort: { available_at: 1, createdAt: 1 }, returnDocument: "after" });
    if (!job) break;
    processed++;
    const owned = { _id: job._id, status: "sending", lease_id: lease };
    try {
      const user = await User.findById(job.user_id);
      const state = await ensureEmailWatermark();
      if (!eligibleUser(user) || user.role !== job.role || user.email_order_notifications !== true || user.email_order_generation !== job.preference_generation || user.email !== job.to || !user.email_order_enabled_at || job.event_at < user.email_order_enabled_at || job.event_at < state.enabled_at) {
        await Outbox.updateOne(owned, { $set: { status: "skipped", lease_id: null, lease_until: null, last_error_code: "RECIPIENT_NO_LONGER_ELIGIBLE" } });
        continue;
      }
      await mail.sendOrderNotificationEmail({ to: job.to, ...job.payload, notificationId: job.event_key });
      await Outbox.updateOne(owned, { $set: { status: "sent", sent_at: clock(), lease_id: null, lease_until: null, last_error_code: null } });
    } catch (error) {
      const exhausted = job.attempts >= MAX_ATTEMPTS;
      // Never persist SMTP response text, recipient addresses or transport secrets.
      const code = /^[A-Z0-9_]{1,50}$/.test(String(error.code || "")) ? error.code : "DELIVERY_FAILED";
      await Outbox.updateOne(owned, { $set: {
        status: exhausted ? "failed" : "pending", lease_id: null, lease_until: null, last_error_code: code,
        available_at: new Date(clock().getTime() + (RETRY_MS[job.attempts - 1] || RETRY_MS.at(-1))),
      } });
    }
  }
  return { processed };
}

module.exports = { deliverableEmail, eligibleUser, ensureEmailWatermark, getPreferences, updatePreferences, enqueueOrderEmail, deliverOrderEmails, MAX_ATTEMPTS, LEASE_MS, RETRY_MS };
