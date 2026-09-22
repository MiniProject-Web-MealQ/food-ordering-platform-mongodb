const path = require("path");
const { pathToFileURL } = require("url");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const connectDB = require("../config/db");
const User = require("../models/User");
const Store = require("../models/Store");
const Menu = require("../models/Menu");
const { hashPassword } = require("../services/password");

async function upsertDemoUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      password_hash: await hashPassword(password),
      role,
    });
  } else {
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
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    storeByClientId.set(restaurant.id, store);
  }

  for (const item of MENU_ITEMS) {
    const store = storeByClientId.get(item.restaurantId);
    if (!store) continue;
    await Menu.findOneAndUpdate(
      { client_id: item.id },
      {
        $set: {
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
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  const paDaeng = storeByClientId.get("pa-daeng");
  if (paDaeng && String(paDaeng.owner_id || "") !== String(merchant._id)) {
    paDaeng.owner_id = merchant._id;
    await paDaeng.save();
  }

  console.log("Seed completed");
  console.log("Customer: customer@mealq.local / Customer123!");
  console.log("Merchant: merchant@mealq.local / Merchant123!");
  console.log(`Seeded ${RESTAURANTS.length} restaurants and ${MENU_ITEMS.length} menu items`);
  console.log(`Demo customer id: ${customer._id}`);
  process.exit(0);
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
