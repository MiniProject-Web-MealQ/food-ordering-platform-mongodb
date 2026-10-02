const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");
const Order = require("../models/Order");

function walletError(code, message, status = 409) {
  return Object.assign(new Error(message), { code, status });
}

async function ensureWallet(userId) {
  try {
    return await Wallet.findOneAndUpdate(
      { user_id: userId }, { $setOnInsert: { user_id: userId, balance: 0 } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code === 11000) return Wallet.findOne({ user_id: userId });
    throw error;
  }
}

// The balance and the idempotency marker change in one MongoDB operation.
// Retrying a credit or debit with the same key can never apply it twice.
async function changeBalance({ userId, amount, type, orderId = null, description = "", key }) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount === 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-7 || !key) {
    throw walletError("INVALID_AMOUNT", "จำนวนเงินต้องเป็นตัวเลขที่มีทศนิยมไม่เกิน 2 ตำแหน่ง", 400);
  }
  const existing = await WalletTransaction.findOne({ idempotency_key: key });
  if (existing) {
    if (String(existing.user_id) !== String(userId) || existing.amount !== Math.abs(amount) || existing.type !== type || existing.direction !== (amount > 0 ? "credit" : "debit")) {
      throw walletError("IDEMPOTENCY_CONFLICT", "คำขอซ้ำมีข้อมูลไม่ตรงกับรายการเดิม");
    }
    return { wallet: await ensureWallet(userId), transaction: existing };
  }
  await ensureWallet(userId);
  const query = { user_id: userId, ledger_keys: { $ne: key } };
  if (amount < 0) query.balance = { $gte: -amount };
  const before = await Wallet.findOneAndUpdate(query, [{ $set: {
    balance: { $add: ["$balance", amount] },
    ledger_keys: { $concatArrays: [{ $ifNull: ["$ledger_keys", []] }, [key]] },
    ledger_results: { $mergeObjects: [{ $ifNull: ["$ledger_results", {}] }, { [key]: {
      before: "$balance", after: { $add: ["$balance", amount] }, amount, type,
    } }] },
  } }], { returnDocument: "before", updatePipeline: true });
  if (!before) {
    const wallet = await Wallet.findOne({ user_id: userId }).select("+ledger_keys +ledger_results");
    if (!wallet?.ledger_keys.includes(key)) throw walletError("INSUFFICIENT_BALANCE", "ยอดเงินใน Wallet ไม่เพียงพอ");
    const applied = wallet.ledger_results?.[key];
    if (!applied || applied.amount !== amount || applied.type !== type) throw walletError("IDEMPOTENCY_CONFLICT", "คำขอซ้ำมีข้อมูลไม่ตรงกับรายการเดิม");
    // Another request may already have applied this operation. Recover the ledger
    // entry without changing the balance again.
    const transaction = await WalletTransaction.findOneAndUpdate({ idempotency_key: key }, {
      $setOnInsert: {
        user_id: userId, order_id: orderId, type, amount: Math.abs(amount),
        direction: amount > 0 ? "credit" : "debit", description,
        balance_before: applied.before, balance_after: applied.after,
      },
    }, { upsert: true, returnDocument: "after" });
    return { wallet, transaction };
  }
  const transaction = await WalletTransaction.findOneAndUpdate({ idempotency_key: key }, {
    $setOnInsert: {
      user_id: userId, order_id: orderId, type, amount: Math.abs(amount),
      direction: amount > 0 ? "credit" : "debit", description,
      balance_before: before.balance, balance_after: before.balance + amount,
    },
  }, { upsert: true, returnDocument: "after" });
  return { wallet: await Wallet.findOne({ user_id: userId }), transaction };
}

async function refundOrderPayment(order) {
  if (order.payment_method !== "wallet" || !["paid", "refunded"].includes(order.payment_status)) return order;
  if (order.total_price > 0) {
    await changeBalance({
      userId: order.customer_id?._id || order.customer_id,
      amount: order.total_price, type: "refund", orderId: order._id,
      key: `order:${order._id}:refund`, description: `คืนเงินออเดอร์ ${order.order_number}`,
    });
  }
  return Order.findByIdAndUpdate(order._id, { $set: { payment_status: "refunded" } }, { returnDocument: "after" });
}

module.exports = { ensureWallet, changeBalance, refundOrderPayment };
