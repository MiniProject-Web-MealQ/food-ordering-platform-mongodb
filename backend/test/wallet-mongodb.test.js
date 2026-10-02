const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const mongoose = require("mongoose");
const Wallet = require("../src/models/Wallet");
const WalletTransaction = require("../src/models/WalletTransaction");
const { changeBalance } = require("../src/services/wallet");

test("MongoDB atomic wallet payments and retry ledger", { skip: process.env.RUN_DB_TESTS !== "true" }, async (t) => {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mealq", { serverSelectionTimeoutMS: 5000 });
  const userId = new mongoose.Types.ObjectId();
  t.after(async () => {
    await Promise.all([Wallet.deleteOne({ user_id: userId }), WalletTransaction.deleteMany({ user_id: userId })]);
    await mongoose.disconnect();
  });
  await Promise.all([Wallet.init(), WalletTransaction.init()]);
  await changeBalance({ userId, amount: 100, type: "topup", key: `test:${userId}:topup` });
  const payments = await Promise.allSettled([
    changeBalance({ userId, amount: -80, type: "payment", key: `test:${userId}:a` }),
    changeBalance({ userId, amount: -80, type: "payment", key: `test:${userId}:b` }),
  ]);
  assert.equal(payments.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(payments.find((result) => result.status === "rejected").reason.code, "INSUFFICIENT_BALANCE");
  assert.equal((await Wallet.findOne({ user_id: userId })).balance, 20);
  const refund = { userId, amount: 80, type: "refund", key: `test:${userId}:refund` };
  await Promise.all([changeBalance(refund), changeBalance(refund)]);
  assert.equal((await Wallet.findOne({ user_id: userId })).balance, 100);
  const tx = await WalletTransaction.findOne({ idempotency_key: refund.key });
  assert.equal(tx.balance_before, 20);
  assert.equal(tx.balance_after, 100);
  await assert.rejects(changeBalance({ ...refund, amount: 100 }), (error) => error.code === "IDEMPOTENCY_CONFLICT");
});
