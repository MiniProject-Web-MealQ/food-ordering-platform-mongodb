import assert from "node:assert/strict";
import test from "node:test";
import { findCustomerOrder } from "../src/features/customer/order-lookup.js";

test("notification database IDs and order-number URLs resolve the same owned order", () => {
  const order = { id: "MQ-DEMO-024", backendOrderId: "6ad60407ffd68e1d1562b4f3" };
  const orders = [order, { id: "MQ-DEMO-025", backendOrderId: "6ad60407ffd68e1d1562b4f4" }];
  assert.equal(findCustomerOrder(orders, order.id), order);
  assert.equal(findCustomerOrder(orders, order.backendOrderId), order);
  assert.equal(findCustomerOrder(orders, "6ad60407ffd68e1d1562b4f5"), null);
  assert.equal(findCustomerOrder([], order.id), null);
});

test("invalid references never select an unrelated order", () => {
  const orders = [{ id: "123", backendOrderId: "abc" }];
  for (const reference of [null, undefined, "", 123, {}, ["123"]]) assert.equal(findCustomerOrder(orders, reference), null);
  assert.equal(findCustomerOrder(null, "123"), null);
});
