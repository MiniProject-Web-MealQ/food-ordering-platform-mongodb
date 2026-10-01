import { MENU_ITEMS, RESTAURANTS } from "@/features/customer/mock-data";

/**
 * MOCK: ข้อมูลจำลองของฝั่งผู้ดูแลระบบ ระหว่างรอ API กลุ่ม /api/v1/admin/*
 * ชื่อ field ใช้ snake_case ตาม model ของ backend (User, Store, Menu, Order, Queue, Promotion,
 * Wallet, WalletTransaction) ร้านและเมนูมาจาก features/customer/mock-data.js ให้ชื่อตรงกันทั้งระบบ
 * ข้อมูลสุ่มด้วย seed คงที่ เปิดกี่ครั้งก็ได้ชุดเดิม (เวลาอิงจากตอนที่สร้าง)
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * MOCK: รหัสผ่านเริ่มต้นของบัญชี admin ที่ seed ไว้ รอ POST /auth/login portal ADMIN
 * admin ที่เพิ่มทีหลังใช้รหัสที่ผู้เพิ่มตั้งให้ (เก็บใน users[].password แบบไม่เข้ารหัส ใช้ทดสอบเท่านั้น)
 */
export const DEMO_ADMIN_PASSWORD = "Admin123!";

/** สุ่มแบบกำหนด seed ได้ (mulberry32) ใช้แทน Math.random เพื่อให้ข้อมูลชุดเดิมทุกครั้ง */
function random(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const CUSTOMER_NAMES = [
  "ปอนด์ ศรีสุข", "มายด์ วงศ์ดี", "เจ ทองคำ", "ฝน แสงจันทร์", "ต้น ใจดี", "แพร พรหมมา", "บอส รุ่งเรือง",
  "มิ้นท์ สายใจ", "กัน ทรัพย์มาก", "ฟ้า ชัยวัฒน์", "นัท บุญมี", "เบล สมใจ", "โอ๊ต ศรีวงศ์", "จูน แก้วใส",
  "ภูมิ มั่นคง", "ขิม ดวงดี", "ทราย พูนผล", "ปาล์ม รักษ์ไทย", "ไอซ์ เพชรงาม", "แบม จันทร์เพ็ญ",
  "ก้อง ทองดี", "เฟิร์น อินทร์แก้ว", "ต่อ สมบูรณ์", "หมิว ใจงาม", "โบ๊ท ชาญชัย", "เอิร์น สุขสันต์",
  "ปั้น นาคสุข", "ใบเตย บัวทอง", "นนท์ พิทักษ์", "ข้าวฟ่าง มีสุข",
];

const OWNER_NAMES = {
  "pa-daeng": "แดง ใจกว้าง",
  "lung-nuat": "หนวด เรือทอง",
  "bean-corner": "ณัฐ คอร์เนอร์",
  "khao-man-kai-je-muay": "หมวย แซ่ลิ้ม",
  "bean-brew": "พลอย บรูว์",
  "sushi-hub": "เคน ทานากะ",
  "seoul-bowl": "มินจี คิม",
  "burger-lab": "แม็ก เบอร์เกอร์",
  "baan-kanom": "หวาน ขนมไทย",
  "krua-khun-toy": "ต้อย ครัวดี",
};

/** ร้านที่เพิ่งสมัคร รอ admin อนุมัติ (ยังไม่มีในแอปลูกค้า) */
const PENDING_STORES = [
  { id: "somtam-pa-ning", name: "ส้มตำป้าหนิง", category: "อาหารอีสาน", owner: "หนิง ส้มตำ", location: "โรงอาหารกลาง ล็อก 11", daysAgo: 2 },
  { id: "chanom-may", name: "ชานมไข่มุกน้องเมย์", category: "เครื่องดื่ม", owner: "เมย์ ชาไทย", location: "อาคาร 7 ชั้น 1", daysAgo: 1 },
];

function emailFor(name, domain) {
  const ascii = {
    "แดง": "daeng", "หนวด": "nuat", "ณัฐ": "nat", "หมวย": "muay", "พลอย": "ploy", "เคน": "ken", "มินจี": "minji",
    "แม็ก": "max", "หวาน": "waan", "ต้อย": "toy", "หนิง": "ning", "เมย์": "may",
  }[name.split(" ")[0]];
  return `${ascii ?? "user"}@${domain}`;
}

function phone(rng) {
  return `08${Math.floor(rng() * 10)}-${String(Math.floor(rng() * 1000)).padStart(3, "0")}-${String(Math.floor(rng() * 10000)).padStart(4, "0")}`;
}

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function hourOf(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
}

export function createSeedState(now) {
  const rng = random(20261001);
  const pick = (list) => list[Math.floor(rng() * list.length)];

  // ---- ผู้ใช้ ----
  const users = [
    { _id: "u-admin-1", name: "ผู้ดูแลระบบ MealQ", email: "admin@mealq.local", phone: "02-000-0001", role: "admin", status: "active", created_at: now - 120 * DAY, password: DEMO_ADMIN_PASSWORD, must_change_password: false },
    { _id: "u-admin-2", name: "สมชาย ผู้ดูแล", email: "somchai.admin@mealq.local", phone: "02-000-0002", role: "admin", status: "active", created_at: now - 60 * DAY, password: DEMO_ADMIN_PASSWORD, must_change_password: false },
  ];
  const customers = CUSTOMER_NAMES.map((name, i) => ({
    _id: `u-c-${i + 1}`,
    name,
    email: i === 0 ? "customer@mealq.local" : `customer${i + 1}@mail.com`,
    phone: phone(rng),
    role: "customer",
    // ลูกค้า 4 คนท้ายเพิ่งสมัครสัปดาห์นี้
    status: i === 7 ? "suspended" : "active",
    created_at: i >= CUSTOMER_NAMES.length - 4 ? now - Math.floor(rng() * 6 + 1) * DAY : now - Math.floor(rng() * 80 + 10) * DAY,
  }));
  users.push(...customers);

  // ---- ร้าน ----
  const stores = RESTAURANTS.map((r, i) => {
    const owner = {
      _id: `u-m-${r.id}`,
      name: OWNER_NAMES[r.id] ?? `เจ้าของ ${r.name}`,
      email: r.id === "pa-daeng" ? "merchant@mealq.local" : emailFor(OWNER_NAMES[r.id] ?? "x", `${r.id}.shop`),
      phone: phone(rng),
      role: "merchant",
      status: "active",
      created_at: now - (100 - i * 7) * DAY,
    };
    users.push(owner);
    return {
      _id: r.id,
      name: r.name,
      category: r.category,
      owner_id: owner._id,
      status: "active",
      is_open: r.isOpen,
      rating: { average: r.rating, count: r.reviewCount },
      opening_hours: { open_time: r.hours.open, close_time: r.hours.close },
      address: { detail: [r.location, r.pickupPoint].filter(Boolean).join(" · ") },
      queue: { max_queue: 30 },
      phone: owner.phone,
      created_at: owner.created_at,
      status_note: null,
    };
  });
  for (const p of PENDING_STORES) {
    const owner = {
      _id: `u-m-${p.id}`,
      name: p.owner,
      email: emailFor(p.owner, `${p.id}.shop`),
      phone: phone(rng),
      role: "merchant",
      status: "active",
      created_at: now - p.daysAgo * DAY,
    };
    users.push(owner);
    stores.push({
      _id: p.id,
      name: p.name,
      category: p.category,
      owner_id: owner._id,
      status: "pending",
      is_open: false,
      rating: { average: 0, count: 0 },
      opening_hours: { open_time: "09:00", close_time: "18:00" },
      address: { detail: p.location },
      queue: { max_queue: 20 },
      phone: owner.phone,
      created_at: owner.created_at,
      status_note: null,
    });
  }
  users.push(
    { _id: "u-s-1", name: "น้ำ พนักงานป้าแดง", email: "staff1@pa-daeng.shop", phone: phone(rng), role: "staff", status: "active", created_at: now - 40 * DAY },
    { _id: "u-s-2", name: "บี พนักงานเรือ", email: "staff@lung-nuat.shop", phone: phone(rng), role: "staff", status: "active", created_at: now - 25 * DAY },
  );

  // ---- เมนู ----
  const menus = MENU_ITEMS.map((m) => ({
    _id: m.id,
    store_id: m.restaurantId,
    name: m.name,
    category: m.category,
    price: m.price,
    is_available: !m.soldOut,
  }));
  const menusByStore = new Map();
  for (const m of menus) menusByStore.set(m.store_id, [...(menusByStore.get(m.store_id) ?? []), m]);

  // ---- คูปอง ----
  const promotions = [
    { _id: "p-1", code: "LUNCH10", title: "ลด 10% ช่วงกลางวัน", description: "ใช้ได้ทุกร้าน", discount_type: "percentage", discount_value: 10, max_discount: 30, minimum_order: 50, start_date: now - 45 * DAY, expire_date: now + 30 * DAY, usage_limit: 1000, per_user_limit: 5, used_count: 0, is_active: true, store_id: null, created_at: now - 45 * DAY },
    { _id: "p-2", code: "NEWUSER20", title: "ลูกค้าใหม่ลด 20 บาท", description: "สำหรับออเดอร์แรก", discount_type: "fixed", discount_value: 20, max_discount: null, minimum_order: 60, start_date: now - 20 * DAY, expire_date: now + 40 * DAY, usage_limit: 300, per_user_limit: 1, used_count: 0, is_active: true, store_id: null, created_at: now - 20 * DAY },
    { _id: "p-3", code: "PADAENG15", title: "ร้านป้าแดงลด 15%", description: "เฉพาะร้านป้าแดง", discount_type: "percentage", discount_value: 15, max_discount: 40, minimum_order: 80, start_date: now - 10 * DAY, expire_date: now + 4 * DAY, usage_limit: 100, per_user_limit: 2, used_count: 0, is_active: true, store_id: "pa-daeng", created_at: now - 10 * DAY },
    { _id: "p-4", code: "EXAM50", title: "ช่วงสอบลด 50 บาท", description: "หมดอายุแล้ว", discount_type: "fixed", discount_value: 50, max_discount: null, minimum_order: 200, start_date: now - 60 * DAY, expire_date: now - 30 * DAY, usage_limit: 200, per_user_limit: 1, used_count: 0, is_active: true, store_id: null, created_at: now - 60 * DAY },
    { _id: "p-5", code: "SWEET5", title: "ของหวานลด 5%", description: "ปิดไว้ชั่วคราว", discount_type: "percentage", discount_value: 5, max_discount: 20, minimum_order: 0, start_date: now - 5 * DAY, expire_date: now + 60 * DAY, usage_limit: null, per_user_limit: 3, used_count: 0, is_active: false, store_id: "baan-kanom", created_at: now - 5 * DAY },
  ];

  // ---- ออเดอร์ 30 วันย้อนหลัง ----
  const activeStores = stores.filter((s) => s.status === "active");
  const storeWeight = { "pa-daeng": 5, "lung-nuat": 4, "bean-brew": 3, "khao-man-kai-je-muay": 3, "sushi-hub": 2, "burger-lab": 2, "seoul-bowl": 2, "bean-corner": 2, "baan-kanom": 1.5, "krua-khun-toy": 1 };
  const weighted = activeStores.flatMap((s) => Array.from({ length: Math.round((storeWeight[s._id] ?? 1) * 2) }, () => s));
  const cancelRate = { "burger-lab": 0.22, "seoul-bowl": 0.12 };
  const activeCustomers = customers.filter((c) => c.status === "active");
  const orders = [];
  const walletTx = [];
  const queueCounter = new Map();
  let orderSeq = 3000;
  const today = startOfDay(now);

  for (let d = 29; d >= 0; d -= 1) {
    const dayStart = today - d * DAY;
    const weekend = [0, 6].includes(new Date(dayStart).getDay());
    const isToday = d === 0;
    const count = isToday ? 26 : Math.round((weekend ? 14 : 28) + rng() * 10);
    const windowEnd = isToday ? now : dayStart + 21 * HOUR;
    for (let n = 0; n < count; n += 1) {
      const store = pick(weighted);
      const open = hourOf(store.opening_hours.open_time);
      const close = Math.min(hourOf(store.opening_hours.close_time), 21);
      let at = dayStart + (open + rng() * Math.max(1, close - open)) * HOUR;
      if (at > windowEnd) at = dayStart + rng() * Math.max(MINUTE, windowEnd - dayStart);
      // วันนี้: 8 ออเดอร์ท้ายอยู่ใน 40 นาทีล่าสุด (ยังทำอยู่) และ 2 ออเดอร์ก่อนหน้าค้างมา 45–90 นาที
      // ไม่ว่าจะเปิดเว็บตอนกี่โมง หน้าภาพรวมก็มีคิวค้างและออเดอร์ค้างนานให้เห็น
      const recentSlot = isToday ? count - n : Infinity;
      if (recentSlot <= 8) at = now - rng() * 38 * MINUTE;
      else if (recentSlot <= 10) at = now - (45 + rng() * 45) * MINUTE;
      const storeMenus = menusByStore.get(store._id) ?? [];
      if (storeMenus.length === 0) continue;
      const lines = Array.from({ length: 1 + Math.floor(rng() * 2) }, () => pick(storeMenus)).map((m) => {
        const quantity = 1 + Math.floor(rng() * 2);
        return { menu_id: m._id, name: m.name, price: m.price, quantity, total_price: m.price * quantity };
      });
      const subtotal = lines.reduce((s, l) => s + l.total_price, 0);
      const promoRoll = rng();
      const promo = promoRoll < 0.12 ? promotions[0] : promoRoll < 0.16 ? promotions[1] : store._id === "pa-daeng" && promoRoll < 0.3 ? promotions[2] : null;
      const promoUsable = promo && at >= promo.start_date && at <= promo.expire_date && subtotal >= promo.minimum_order;
      const discount = promoUsable
        ? promo.discount_type === "percentage"
          ? Math.min(Math.round((subtotal * promo.discount_value) / 100), promo.max_discount ?? Infinity)
          : promo.discount_value
        : 0;
      if (promoUsable) promo.used_count += 1;
      const payRoll = rng();
      const payment_method = payRoll < 0.55 ? "promptpay" : payRoll < 0.75 ? "card" : "wallet";
      const customer = pick(activeCustomers);

      // สถานะ: ออเดอร์เก่าเกือบทั้งหมดจบแล้ว ส่วนวันนี้ยิ่งใหม่ยิ่งยังทำอยู่
      const age = now - at;
      let status = rng() < (cancelRate[store._id] ?? 0.06) ? "cancelled" : "completed";
      if (recentSlot <= 10) status = "completed";
      if (isToday && status === "completed") {
        if (age < 8 * MINUTE) status = "pending";
        else if (age < 15 * MINUTE) status = "confirmed";
        else if (age < 25 * MINUTE) status = "preparing";
        else if (age < 40 * MINUTE) status = "ready";
      }
      const key = `${store._id}-${dayStart}`;
      const queueNumber = (queueCounter.get(key) ?? 0) + 1;
      queueCounter.set(key, queueNumber);
      orderSeq += 1;
      const order = {
        _id: `o-${orderSeq}`,
        order_number: `MQ${orderSeq}`,
        store_id: store._id,
        customer_id: customer._id,
        items: lines,
        subtotal,
        service_fee: 4,
        discount,
        total_price: subtotal + 4 - discount,
        payment_method,
        promotion: promoUsable ? { code: promo.code } : null,
        status,
        order_date: Math.round(at),
        updated_at: Math.round(status === "completed" ? at + (12 + rng() * 10) * MINUTE : at + rng() * 5 * MINUTE),
        queue: { queue_number: queueNumber, receive_code: String(1000 + Math.floor(rng() * 9000)) },
        cancel: status === "cancelled" ? { by: rng() < 0.7 ? "store" : "customer", reason: pick(["วัตถุดิบหมด", "ลูกค้าขอยกเลิก", "ร้านปิดก่อนเวลา", "ทำไม่ทัน"]), at: Math.round(at + 6 * MINUTE) } : null,
        refund: null,
      };
      if (order.updated_at > now) order.updated_at = now;
      orders.push(order);
      if (payment_method === "wallet") {
        walletTx.push({ _id: `wt-${order._id}`, user_id: customer._id, order_id: order._id, type: "payment", amount: -order.total_price, description: `ชำระออเดอร์ ${order.order_number}`, created_at: order.order_date, by: null });
      }
    }
  }

  // ออเดอร์ค้างนานเกิน 30 นาที 2 รายการ (ให้หน้าภาพรวมมีเรื่องต้องดูแล)
  orders
    .filter((o) => o.order_date > now - 95 * MINUTE && o.order_date < now - 44 * MINUTE && o.status === "completed")
    .slice(0, 2)
    .forEach((o, i) => {
      o.status = i === 0 ? "pending" : "preparing";
      o.updated_at = o.order_date + 3 * MINUTE;
    });

  // คืนเงินแล้วบางรายการที่ถูกยกเลิก
  orders
    .filter((o) => o.status === "cancelled" && o.order_date < now - 2 * DAY)
    .slice(0, 6)
    .forEach((o) => {
      o.refund = { amount: o.total_price, method: o.payment_method === "wallet" ? "wallet" : "original", note: "คืนเต็มจำนวน", at: o.cancel.at + 30 * MINUTE, by: "u-admin-2" };
      if (o.refund.method === "wallet") {
        walletTx.push({ _id: `wt-r-${o._id}`, user_id: o.customer_id, order_id: o._id, type: "refund", amount: o.total_price, description: `คืนเงินออเดอร์ ${o.order_number}`, created_at: o.refund.at, by: "u-admin-2" });
      }
    });

  // ---- Wallet: เติมเงินให้ทุกคนก่อน แล้วไล่ยอดตามลำดับเวลา ----
  for (const c of customers) {
    for (let k = 0; k < 3; k += 1) {
      walletTx.push({ _id: `wt-top-${c._id}-${k}`, user_id: c._id, order_id: null, type: "topup", amount: pick([100, 200, 300, 500]), description: "เติมเงินผ่าน PromptPay", created_at: Math.min(c.created_at, now - 28 * DAY) + k * 9 * DAY, by: null });
    }
  }
  walletTx.sort((a, b) => a.created_at - b.created_at);
  const balances = new Map();
  for (const tx of walletTx) {
    const before = balances.get(tx.user_id) ?? 0;
    // ยอดไม่พอจ่าย: ถือว่าเติมเงินพอดีก่อนจ่าย (ข้อมูลจำลองให้ยอดไม่ติดลบ)
    const after = Math.max(0, before + tx.amount);
    tx.balance_before = before;
    tx.balance_after = after;
    balances.set(tx.user_id, after);
  }
  const wallets = customers.map((c) => ({ user_id: c._id, balance: balances.get(c._id) ?? 0 }));

  const activity = [
    { _id: "a-1", at: now - 3 * DAY, actor_id: "u-admin-2", action: "user.suspend", target_type: "user", target_id: "u-c-8", target_label: customers[7].name, detail: "สั่งแล้วไม่มารับซ้ำหลายครั้ง" },
    { _id: "a-2", at: now - 5 * DAY, actor_id: "u-admin-1", action: "promotion.create", target_type: "promotion", target_id: "p-5", target_label: "SWEET5", detail: null },
    { _id: "a-3", at: now - 2 * DAY, actor_id: "u-admin-2", action: "order.refund", target_type: "order", target_id: orders.find((o) => o.refund)?._id ?? "", target_label: orders.find((o) => o.refund)?.order_number ?? "", detail: "คืนเต็มจำนวน" },
  ];

  return {
    session: null,
    users,
    stores,
    menus,
    orders: orders.sort((a, b) => b.order_date - a.order_date),
    promotions,
    wallets,
    wallet_transactions: walletTx.sort((a, b) => b.created_at - a.created_at),
    activity: activity.sort((a, b) => b.at - a.at),
    settings: {
      service_fee: 4,
      maintenance_mode: false,
      maintenance_message: "ระบบปิดปรับปรุงชั่วคราว จะกลับมาให้บริการเร็ว ๆ นี้",
      categories: [
        { value: "single", label: "อาหารจานเดียว", enabled: true },
        { value: "noodle", label: "เส้น", enabled: true },
        { value: "drink", label: "เครื่องดื่ม", enabled: true },
        { value: "dessert", label: "ของหวาน", enabled: true },
      ],
    },
  };
}
