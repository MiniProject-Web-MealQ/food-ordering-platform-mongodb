const path = require("path");
const { pathToFileURL } = require("url");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectDB = require("../config/db");
const User = require("../models/User");
const Store = require("../models/Store");
const Menu = require("../models/Menu");
const Wallet = require("../models/Wallet");
const Promotion = require("../models/Promotion");
const { hashPassword } = require("../services/password");
const resetDemo = process.argv.includes("--reset-demo");

async function upsertDemoUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      password_hash: await hashPassword(password),
      role,
    });
  } else if (resetDemo) {
    user.name = name;
    user.role = role;
    user.password_hash = await hashPassword(password);
    await user.save();
  }
  return user;
}

async function run() {
  await connectDB();

  const customer = await upsertDemoUser({
    name: "Demo Customer",
    email: "customer@mealq.local",
    password: "Customer123!",
    role: "customer",
  });
  const merchant = await upsertDemoUser({
    name: "Demo Merchant",
    email: "merchant@mealq.local",
    password: "Merchant123!",
    role: "merchant",
  });
  await upsertDemoUser({ name: "Demo Admin", email: "admin@mealq.local", password: "Admin123!", role: "admin" });
  await Wallet.findOneAndUpdate({ user_id: customer._id }, { $setOnInsert: { balance: 1000 } }, { upsert: true, setDefaultsOnInsert: true });
  await Promotion.findOneAndUpdate({ store_id: null, code: "LUNCH10" }, {
    $setOnInsert: { title: "ลด 10%", discount_type: "percentage", discount_value: 10, minimum_order: 0, start_date: new Date("2020-01-01"), expire_date: new Date("2099-12-31"), is_active: true },
  }, { upsert: true, setDefaultsOnInsert: true });

  const mockDataPath = path.resolve(__dirname, "../../../frontend/src/features/customer/mock-data.js");
  const { RESTAURANTS, MENU_ITEMS } = await import(pathToFileURL(mockDataPath).href);

  const storeByClientId = new Map();
  for (const restaurant of RESTAURANTS) {
    const update = {
      client_id: restaurant.id,
      name: restaurant.name,
      description: restaurant.about || "",
      address: { detail: [restaurant.location, restaurant.pickupPoint].filter(Boolean).join(" · ") },
      phone: restaurant.phone || null,
      rating: { average: Number(restaurant.rating || 0), count: Number(restaurant.reviewCount || 0) },
      opening_hours: {
        open_time: restaurant.hours?.open || "",
        close_time: restaurant.hours?.close || "",
      },
      is_open: restaurant.isOpen !== false,
      ...(restaurant.id === "pa-daeng" ? { owner_id: merchant._id } : {}),
    };

    const store = await Store.findOneAndUpdate(
      { client_id: restaurant.id },
      { [resetDemo ? "$set" : "$setOnInsert"]: update },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    storeByClientId.set(restaurant.id, store);
  }

  for (const item of MENU_ITEMS) {
    const store = storeByClientId.get(item.restaurantId);
    if (!store) continue;
    await Menu.findOneAndUpdate(
      { client_id: item.id },
      {
        [resetDemo ? "$set" : "$setOnInsert"]: {
          client_id: item.id,
          store_id: store._id,
          name: item.name,
          description: item.description || "",
          category: item.category || "single",
          price: Number(item.price || 0),
          option_groups: item.optionGroups || [],
          sold_quantity: Number(item.weeklyOrders || 0),
          cook_time: Number(item.prepMinutes || 0),
          is_available: item.soldOut !== true,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  const paDaeng = storeByClientId.get("pa-daeng");
  if (paDaeng && !paDaeng.owner_id) {
    paDaeng.owner_id = merchant._id;
    await paDaeng.save();
  }

  console.log("Seed completed");
  console.log("Customer: customer@mealq.local / Customer123!");
  console.log("Merchant: merchant@mealq.local / Merchant123!");
  console.log("Admin: admin@mealq.local / Admin123!");
  console.log("Seed preserves existing users, menus and stores. Pass --reset-demo to restore demo fields/passwords.");
  console.log(`Seeded ${RESTAURANTS.length} restaurants and ${MENU_ITEMS.length} menu items`);
  console.log(`Demo customer id: ${customer._id}`);
  process.exit(0);
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
