const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { snapshotStore, orderStoreView } = require("../src/services/order-store-view");

test("historical order keeps its original store identity after populate finds a deleted store", () => {
  const oldStore = { _id: new mongoose.Types.ObjectId(), name: "ครัวเดิม", client_id: "original-store" };
  const snapshot = snapshotStore(oldStore);
  assert.deepEqual(orderStoreView({ store_id: null, store_snapshot: snapshot }), { id: String(oldStore._id), name: "ครัวเดิม", clientId: "original-store" });
  assert.deepEqual(orderStoreView({ store_id: oldStore._id, store_snapshot: snapshot }), snapshot);
});

test("live populated store wins and ObjectId is not mistaken for a populated store", () => {
  const id = new mongoose.Types.ObjectId();
  assert.deepEqual(orderStoreView({ store_id: { _id: id, name: "Current store", client_id: "current" }, store_snapshot: { id: String(id), name: "Older name" } }), { id: String(id), name: "Current store", clientId: "current" });
  assert.deepEqual(orderStoreView({ store_id: id }), { id: String(id) });
  assert.deepEqual(orderStoreView({ store_id: null }), { id: null });
});
