const test = require("node:test");
const assert = require("node:assert/strict");
const Wallet = require("../src/models/Wallet");
const WalletTransaction = require("../src/models/WalletTransaction");
const Order = require("../src/models/Order");
const Queue = require("../src/models/Queue");
const { changeBalance, refundOrderPayment } = require("../src/services/wallet");
const { cancelOrder } = require("../src/services/order-lifecycle");

// This model double executes each balance mutation synchronously, as MongoDB's
// single-document update does, while the service requests run concurrently.
function ledger(t, initialBalance) {
  const state = { user_id: "user", balance: initialBalance, ledger_keys: [], ledger_results: {} };
  const transactions = new Map();
  const snapshot = () => structuredClone(state);
  t.mock.method(WalletTransaction, "findOne", async ({ idempotency_key }) => transactions.get(idempotency_key) || null);
  t.mock.method(WalletTransaction, "findOneAndUpdate", async ({ idempotency_key }, update) => {
    if (!transactions.has(idempotency_key)) transactions.set(idempotency_key, { _id: idempotency_key, idempotency_key, ...update.$setOnInsert });
    return transactions.get(idempotency_key);
  });
  t.mock.method(Wallet, "findOneAndUpdate", async (query, update) => {
    if (update.$setOnInsert) return snapshot();
    const key = query.ledger_keys.$ne;
    if (state.ledger_keys.includes(key) || (query.balance && state.balance < query.balance.$gte)) return null;
    const amount = update[0].$set.balance.$add[1];
    const type = update[0].$set.ledger_results.$mergeObjects[1][key].type;
    const before = snapshot();
    state.balance += amount;
    state.ledger_keys.push(key);
    state.ledger_results[key] = { before: before.balance, after: state.balance, amount, type };
    return before;
  });
  t.mock.method(Wallet, "findOne", () => {
    const result = Promise.resolve(snapshot());
    result.select = () => Promise.resolve(snapshot());
    return result;
  });
  return { state, transactions };
}

test("simultaneous payments cannot overdraw a wallet", async (t) => {
  const { state } = ledger(t, 100);
  const results = await Promise.allSettled([
    changeBalance({ userId: "user", amount: -80, type: "payment", key: "order:a:payment" }),
    changeBalance({ userId: "user", amount: -80, type: "payment", key: "order:b:payment" }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const failure = results.find((result) => result.status === "rejected");
  assert.equal(failure.reason.code, "INSUFFICIENT_BALANCE");
  assert.equal(state.balance, 20);
});

test("concurrent retries credit a wallet once and retain the original ledger amounts", async (t) => {
  const { state, transactions } = ledger(t, 100);
  const request = { userId: "user", amount: 20, type: "topup", key: "topup:request1" };
  await Promise.all([changeBalance(request), changeBalance(request), changeBalance(request)]);
  assert.equal(state.balance, 120);
  assert.equal(transactions.size, 1);
  assert.equal(transactions.get(request.key).balance_before, 100);
  assert.equal(transactions.get(request.key).balance_after, 120);
  await assert.rejects(changeBalance({ ...request, amount: 30 }), (error) => error.code === "IDEMPOTENCY_CONFLICT");
});

test("invalid wallet amounts cannot mutate a balance", async (t) => {
  const { state } = ledger(t, 100);
  for (const amount of [0, NaN, Infinity, "20", 1.234]) {
    await assert.rejects(changeBalance({ userId: "user", amount, type: "topup", key: "invalid" }), (error) => error.code === "INVALID_AMOUNT");
  }
  assert.equal(state.balance, 100);
});

test("repeated wallet cancellation refunds once", async (t) => {
  const { state, transactions } = ledger(t, 20);
  const order = { _id: "order1", order_number: "MQ1", customer_id: "user", total_price: 80, payment_method: "wallet", payment_status: "paid" };
  t.mock.method(Order, "findByIdAndUpdate", async (_id, update) => ({ ...order, ...update.$set }));
  await Promise.all([refundOrderPayment(order), refundOrderPayment(order)]);
  assert.equal(state.balance, 100);
  assert.equal(transactions.size, 1);
  assert.equal(transactions.get("order:order1:refund").type, "refund");
});

test("simulated external payments never credit wallet refunds", async (t) => {
  const { state } = ledger(t, 20);
  await refundOrderPayment({ payment_method: "promptpay", payment_status: "simulated", total_price: 80 });
  assert.equal(state.balance, 20);
});

test("cancellation uses a conditional transition and records its actor", async (t) => {
  const order = { _id: "order1", status: "cancelled", payment_method: "promptpay", payment_status: "simulated" };
  let filter;
  let change;
  t.mock.method(Order, "findOneAndUpdate", async (query, update) => { filter = query; change = update.$set; return order; });
  t.mock.method(Queue, "updateOne", async () => ({}));
  const result = await cancelOrder({ _id: "order1", customer_id: "user" }, { by: "customer", reason: "Changed mind" });
  assert.equal(result.status, "cancelled");
  assert.deepEqual(filter.status.$in, ["pending", "confirmed"]);
  assert.equal(filter.customer_id, "user");
  assert.equal(change.cancelled_by, "customer");
  assert.equal(change.cancelled_reason, "Changed mind");
});
