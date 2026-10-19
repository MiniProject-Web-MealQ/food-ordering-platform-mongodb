// Real API and MongoDB checks in a random loopback-only synthetic database.
// Never imports the production server or starts mail/push/recovery workers.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const express = require('express');
const { hashPassword } = require('../src/services/password');
const User = require('../src/models/User');
const Store = require('../src/models/Store');
const Menu = require('../src/models/Menu');
const Ingredient = require('../src/models/Ingredient');
const Order = require('../src/models/Order');
const Wallet = require('../src/models/Wallet');
const Queue = require('../src/models/Queue');
const database = `mealq_inventory_required_${crypto.randomBytes(8).toString('hex')}`;
const password = `Synthetic-${crypto.randomBytes(20).toString('base64url')}9`;
let server, base, connected = false, passes = 0;
const pass = message => { passes++; console.log(`[PASS] ${message}`); };
function client() {
  let cookie = '';
  return async (method, route, body, expected = 200, key) => {
    const response = await fetch(base + route, { method, headers: { Origin: 'https://mealq.site', Cookie: cookie, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
    for (const value of response.headers.getSetCookie()) if (value.startsWith('mealq_session=')) cookie = value.split(';')[0];
    const data = await response.json();
    if (Array.isArray(expected)) {
      assert.ok(expected.includes(response.status), `${method} ${route}: ${response.status} ${JSON.stringify(data)}`);
      return { status: response.status, data };
    }
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
    return data;
  };
}
const guest = client(), customer = client(), merchant = client();
async function run() {
  const uri = new URL(process.env.INVENTORY_TEST_MONGO_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/unused');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname), 'Tests refuse remote MongoDB');
  uri.pathname = `/${database}`;
  Object.assign(process.env, { NODE_ENV: 'development', PAYMENT_MODE: 'demo', FRONTEND_URL: 'https://mealq.site', SESSION_SECRET: crypto.randomUUID(), SMTP_HOST: '', SMTP_PASSWORD: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' });
  await mongoose.connect(uri.href, { serverSelectionTimeoutMS: 5000 }); connected = true;
  const app = express(); app.use(express.json());
  app.use('/api/v1/auth', require('../src/routes/authRoutes'));
  app.use('/api/v1/customer', require('../src/routes/customerRoutes'));
  app.use('/api/v1/merchant', require('../src/routes/merchantRoutes'));
  app.use('/api/v1/orders', require('../src/routes/orderRoutes'));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.message, details: error.details } }));
  await Promise.all(mongoose.modelNames().map(name => mongoose.model(name).init()));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const hash = await hashPassword(password);
  const buyer = await User.create({ name: 'Synthetic inventory buyer', email: `buyer-${crypto.randomUUID()}@example.invalid`, password_hash: hash, role: 'customer', status: 'active' });
  const seller = await User.create({ name: 'Synthetic inventory seller', email: `seller-${crypto.randomUUID()}@example.invalid`, password_hash: hash, role: 'merchant', status: 'active' });
  const store = await Store.create({ owner_id: seller._id, name: 'Synthetic inventory shop', status: 'active', is_open: true, opening_hours: { automatic: false } });
  await customer('POST', '/auth/login', { email: buyer.email, password, portal: 'customer' });
  await merchant('POST', '/auth/login', { email: seller.email, password, portal: 'merchant' });
  await customer('POST', '/customer/wallet/topup', { amount: 10000 }, 201, 'synthetic-topup');
  await guest('POST', '/orders/check-stock', { items: [] }, 401);
  await merchant('POST', '/orders/check-stock', { items: [] }, 403);
  const chicken = (await merchant('POST', '/merchant/inventory', { name: 'Synthetic chicken', unit: 'kg', quantity: 10, lowStockThreshold: 1 }, 201)).ingredient;
  const recipe = quantity => [{ ingredientId: chicken.id, quantity, unit: 'kg' }];
  const countBefore = await Menu.countDocuments();
  for (const ingredients of [undefined, []]) for (const isAvailable of [true, false]) {
    await merchant('POST', '/merchant/menu', { name: 'Missing recipe', price: 40, ingredients, isAvailable }, 400);
  }
  assert.equal(await Menu.countDocuments(), countBefore);
  const foreign = await Ingredient.create({ store_id: new mongoose.Types.ObjectId(), name: 'Foreign stock', quantity: 99, unit: 'kg' });
  await merchant('POST', '/merchant/menu', { name: 'Foreign recipe', price: 40, ingredients: [{ ingredientId: String(foreign._id), quantity: 1, unit: 'kg' }] }, 400);
  await merchant('POST', '/merchant/menu', { name: 'Wrong unit', price: 40, ingredients: [{ ingredientId: chicken.id, quantity: 1, unit: 'g' }] }, 400);
  const a = (await merchant('POST', '/merchant/menu', { name: 'Synthetic chicken rice', category: 'single', price: 40, ingredients: recipe(2) }, 201)).menu;
  const b = (await merchant('POST', '/merchant/menu', { name: 'Synthetic chicken bowl', category: 'single', price: 30, ingredients: recipe(3) }, 201)).menu;
  await merchant('PATCH', `/merchant/menu/${a.id}`, { ingredients: [] }, 400);
  pass('Create requires recipes for open and closed menus; API rejects foreign/unit-mismatched recipes and removing the last ingredient');

  async function snapshot() {
    return mongoose.mongo.BSON.EJSON.stringify({ stock: await Ingredient.collection.findOne({ _id: new mongoose.Types.ObjectId(chicken.id) }), wallet: await Wallet.collection.findOne({ user_id: buyer._id }), orders: await Order.countDocuments(), queues: await Queue.countDocuments() });
  }
  const valid = { items: [{ menuId: a.id, quantity: 2 }, { menuId: b.id, quantity: 1 }], paymentMethod: 'wallet' };
  const beforePreflight = await snapshot();
  assert.deepEqual(await customer('POST', '/orders/check-stock', valid), { available: true });
  const short = await customer('POST', '/orders/check-stock', { ...valid, items: [{ menuId: a.id, quantity: 2 }, { menuId: b.id, quantity: 3 }] }, 409);
  assert.equal(short.error.code, 'OUT_OF_STOCK');
  assert.deepEqual(new Set(short.error.details.shortages.map(row => row.menuId)), new Set([a.id, b.id]));
  for (const row of short.error.details.shortages) assert.deepEqual(Object.keys(row).sort(), ['menuId', 'name']);
  assert.equal(await snapshot(), beforePreflight, 'Preflight must not reserve stock, create orders or touch Wallet');
  pass('Read-only preflight aggregates shared ingredients across all cart lines without exposing ingredient amounts or writing stock/money/orders');

  const legacy = await Menu.create({ store_id: store._id, name: 'Legacy recipe-less dish', category: 'single', price: 20, ingredients: [], image: '/catalogue/synthetic-dish.webp', is_available: true });
  const legacyBody = { items: [{ menuId: String(legacy._id), quantity: 1 }], paymentMethod: 'wallet' };
  const legacyBefore = await snapshot();
  assert.equal((await customer('POST', '/orders/check-stock', legacyBody, 409)).error.code, 'RECIPE_NOT_CONFIGURED');
  assert.equal((await customer('POST', '/orders', legacyBody, 409, 'legacy-blocked')).error.code, 'RECIPE_NOT_CONFIGURED');
  assert.equal(await snapshot(), legacyBefore);
  await merchant('PATCH', `/merchant/menu/${legacy._id}`, { ingredients: recipe(.25), description: 'Set recipe while retaining existing image' });
  assert.equal((await Menu.findById(legacy._id)).image, '/catalogue/synthetic-dish.webp');
  assert.deepEqual(await customer('POST', '/orders/check-stock', legacyBody), { available: true });
  const linked = (await merchant('GET', '/merchant/menu')).menus.find(row => row.id === String(legacy._id));
  assert.equal(linked.ingredients[0].quantity, .25); assert.equal(String(linked.ingredients[0].ingredient_id), chicken.id);
  const fractional = (await customer('POST', '/orders', { ...legacyBody, items: [{ menuId: String(legacy._id), quantity: 3 }] }, 201, 'fractional-stock')).order;
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 9.25);
  await customer('PATCH', `/orders/${fractional.id}/cancel`, {});
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 10);
  assert.equal((await Wallet.findOne({ user_id: buyer._id })).balance, 10000);
  pass('Legacy unlinked menus cannot debit Wallet; adding a fractional recipe preserves its image, deducts .75 for three dishes and restores on cancellation');

  const order = (await customer('POST', '/orders', valid, 201, 'stock-order')).order;
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 3);
  const after = await snapshot();
  assert.equal((await customer('POST', '/orders/check-stock', valid, 409)).error.code, 'OUT_OF_STOCK');
  const replay = (await customer('POST', '/orders', valid, 201, 'stock-order')).order;
  assert.equal(replay.id, order.id); assert.equal(await snapshot(), after);
  await customer('PATCH', `/orders/${order.id}/cancel`, {});
  await customer('PATCH', `/orders/${order.id}/cancel`, {});
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 10);
  assert.equal((await Wallet.findOne({ user_id: buyer._id })).balance, 10000);
  pass('Checkout deducts aggregated stock once, uncertain replay bypasses a fresh shortage, and repeated cancellation restores once');

  const race = { items: [{ menuId: a.id, quantity: 4 }], paymentMethod: 'wallet' };
  assert.deepEqual(await customer('POST', '/orders/check-stock', race), { available: true });
  await merchant('PATCH', `/merchant/inventory/${chicken.id}`, { adjustment: -5 });
  const balanceBeforeRace = (await Wallet.findOne({ user_id: buyer._id })).balance;
  assert.equal((await customer('POST', '/orders', race, 409, 'race-shortage')).error.code, 'OUT_OF_STOCK');
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 5);
  assert.equal((await Wallet.findOne({ user_id: buyer._id })).balance, balanceBeforeRace);
  await merchant('PATCH', `/merchant/inventory/${chicken.id}`, { adjustment: 5 });
  pass('Stock changing after a successful preflight is rechecked at checkout before Wallet debit');

  const one = { items: [{ menuId: a.id, quantity: 1 }], paymentMethod: 'wallet' };
  const completed = (await customer('POST', '/orders', one, 201, 'completed-stock')).order;
  for (const status of ['confirmed', 'preparing', 'ready']) await merchant('PATCH', `/merchant/orders/${completed.id}/status`, { status });
  await merchant('POST', `/merchant/orders/${completed.id}/receive`, { receiveCode: completed.pickupCode });
  await merchant('POST', `/merchant/orders/${completed.id}/receive`, { receiveCode: completed.pickupCode });
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 8);
  const promptpay = (await customer('POST', '/orders', { ...one, paymentMethod: 'promptpay' }, 201, 'promptpay-stock')).order;
  assert.equal(promptpay.paymentStatus, 'simulated');
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 6);
  await customer('PATCH', `/orders/${promptpay.id}/cancel`, {});
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 8);
  pass('Completed pickup retains the deduction; PromptPay demo also deducts stock and restores cancelled stock');

  await merchant('PATCH', `/merchant/inventory/${chicken.id}`, { adjustment: -6 });
  const oldBalance = (await Wallet.findOne({ user_id: buyer._id })).balance;
  const attempts = await Promise.all([0, 1].map(index => customer('POST', '/orders', one, [201, 409], `last-stock-${index}`)));
  const winners = attempts.filter(row => row.status === 201);
  assert.equal(winners.length, 1);
  assert.equal(attempts.filter(row => row.status === 409).length, 1);
  assert.equal((await Ingredient.findById(chicken.id)).quantity, 0);
  assert.equal((await Wallet.findOne({ user_id: buyer._id })).balance, oldBalance - winners[0].data.order.totalPrice);
  pass('Last available portions cannot be oversold or debited twice');
  console.log(`${passes} inventory groups passed in an isolated database; no external mail/push sent.`);
}
async function archiveAndClose() {
  if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  if (!connected || mongoose.connection.readyState !== 1) return;
  assert.equal(mongoose.connection.name, database); assert.match(database, /^mealq_inventory_required_[a-f0-9]{16}$/);
  const collections = {};
  for (const { name } of await mongoose.connection.db.listCollections().toArray()) {
    const collection = mongoose.connection.db.collection(name);
    collections[name] = { documents: await collection.find({}).toArray(), indexes: await collection.indexes() };
  }
  const directory = path.join(os.tmpdir(), 'mealq-inventory-check-archives'); await fs.mkdir(directory, { recursive: true });
  const archive = path.join(directory, `${database}.json`);
  const snapshot = mongoose.mongo.BSON.EJSON.stringify({ database, syntheticOnly: true, savedAt: new Date(), collections }, null, 2);
  await fs.writeFile(archive, snapshot, { flag: 'wx', mode: 0o600 });
  assert.equal(await fs.readFile(archive, 'utf8'), snapshot, 'Verify full synthetic document/index archive before targeted cleanup');
  const sha = crypto.createHash('sha256').update(snapshot).digest('hex');
  await fs.writeFile(archive + '.sha256', `${sha}  ${path.basename(archive)}\n`, { flag: 'wx', mode: 0o600 });
  await mongoose.connection.dropDatabase();
  console.log(`Synthetic database archived before cleanup: ${archive}`);
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  try { await archiveAndClose(); } catch (error) { console.error('Cleanup refused; test database retained:', error.message); process.exitCode = 1; }
  await mongoose.disconnect();
});
