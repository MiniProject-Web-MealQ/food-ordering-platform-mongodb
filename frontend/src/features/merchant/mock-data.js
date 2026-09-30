import { QUEUE_STATUS_FOR_ORDER } from "./status";

/**
 * MOCK: seed data for the merchant app until it reads from the API.
 * Field names follow the backend models (Store, Menu, Order, Queue) in snake_case.
 * Store and menu ids match features/customer/mock-data.js so both sides describe the same shop.
 */

const MINUTE = 60 * 1000;

/** MOCK: the store owned by the signed-in merchant. Replace with GET /merchant/store. */
export const MERCHANT_STORE_ID = "pa-daeng";

/** MOCK: the only account the fake login accepts. Replace with POST /auth/login (portal MERCHANT). */
export const DEMO_ACCOUNT = {
  email: "padaeng@mealq.app",
  password: "mealq1234",
  name: "ป้าแดง",
};

/** Suggestions for the category field; merchants may type their own. */
export const MENU_CATEGORY_SUGGESTIONS = ["อาหารจานเดียว", "กับข้าว", "เครื่องดื่ม", "ของหวาน", "ของทานเล่น"];

export const PAYMENT_METHOD_LABEL = {
  promptpay: "PromptPay",
  card: "บัตรเครดิต/เดบิต",
  wallet: "MealQ Wallet",
};

function seedStore() {
  return {
    _id: MERCHANT_STORE_ID,
    name: "ร้านป้าแดง",
    description: "อาหารตามสั่งเจ้าเก่าประจำอาคาร 12 ผัดใหม่ทุกจาน ใช้หมูกรอบทอดเองทุกเช้า",
    phone: "081-234-1234",
    address: { detail: "อาคาร 12 ชั้น 1 ช่อง 4" },
    rating: { average: 4.8, count: 642 },
    queue: { max_queue: 30 },
    opening_hours: { open_time: "07:00", close_time: "20:00" },
    is_open: true,
  };
}

function menu(fields) {
  return {
    store_id: MERCHANT_STORE_ID,
    description: "",
    image: null,
    is_available: true,
    ...fields,
  };
}

function seedMenus() {
  return [
    menu({
      _id: "kaprao-moo-krob",
      name: "ข้าวกะเพราหมูกรอบ",
      description: "หมูกรอบทอดใหม่ ผัดพริกกะเพราสด เสิร์ฟพร้อมข้าวหอมมะลิ",
      category: "อาหารจานเดียว",
      price: 65,
      cook_time: 6,
      sold_quantity: 356,
    }),
    menu({
      _id: "kaprao-moo-sab",
      name: "ข้าวกะเพราหมูสับ",
      description: "หมูสับผัดกะเพราใส่ถั่วฝักยาว ไข่ดาวเพิ่มได้",
      category: "อาหารจานเดียว",
      price: 55,
      cook_time: 5,
      sold_quantity: 312,
    }),
    menu({
      _id: "khao-pad-kung",
      name: "ข้าวผัดกุ้งสด",
      description: "กุ้งสด 5 ตัว ไข่ผัดฟู",
      category: "อาหารจานเดียว",
      price: 75,
      cook_time: 7,
      sold_quantity: 140,
    }),
    menu({
      _id: "khao-tom-yum-talay",
      name: "ข้าวต้มยำทะเล",
      description: "ต้มยำน้ำข้น กุ้ง หมึก หอยแมลงภู่",
      category: "อาหารจานเดียว",
      price: 70,
      cook_time: 8,
      sold_quantity: 88,
      is_available: false,
    }),
    menu({
      _id: "khao-khai-jeow",
      name: "ข้าวไข่เจียวหมูสับ",
      description: "ไข่เจียวฟูกรอบ ราดซอสศรีราชา",
      category: "อาหารจานเดียว",
      price: 45,
      cook_time: 4,
      sold_quantity: 120,
    }),
    menu({
      _id: "nam-plao",
      name: "น้ำเปล่า 600ml",
      description: "น้ำดื่มขวด",
      category: "เครื่องดื่ม",
      price: 10,
      cook_time: 1,
      sold_quantity: 210,
    }),
    menu({
      _id: "cha-thai-yen",
      name: "ชาไทยเย็น",
      description: "ชาไทยใส่นมสด หวานน้อยได้",
      category: "เครื่องดื่ม",
      price: 30,
      cook_time: 2,
      sold_quantity: 174,
    }),
  ];
}

/**
 * Today's orders: [queue_number, status, minutes ago, customer, receive_code, items, extra].
 * items: [menu _id, quantity, note?]
 */
const SEED_ORDERS = [
  [1, "completed", 290, "ปอนด์", "4821", [["kaprao-moo-krob", 1, "ไข่ดาวไม่สุก"], ["nam-plao", 1]]],
  [2, "completed", 262, "มายด์", "1937", [["khao-khai-jeow", 1]]],
  [3, "completed", 231, "เจ", "5502", [["kaprao-moo-sab", 2, "เผ็ดน้อย"]], { payment_method: "wallet" }],
  [4, "cancelled", 205, "ฝน", "7310", [["khao-pad-kung", 1]]],
  [5, "completed", 180, "ต้น", "2648", [["kaprao-moo-krob", 1], ["cha-thai-yen", 1]], { discount: 10 }],
  [6, "completed", 142, "แพร", "9054", [["khao-pad-kung", 1], ["cha-thai-yen", 2]], { payment_method: "card" }],
  [7, "completed", 96, "บอส", "3176", [["kaprao-moo-krob", 2]]],
  [8, "completed", 61, "มิ้นท์", "6620", [["kaprao-moo-sab", 1], ["nam-plao", 1]]],
  [9, "completed", 40, "กัน", "8403", [["khao-khai-jeow", 2, "ไม่ใส่ซอส"]]],
  [10, "ready", 24, "ฟ้า", "1459", [["kaprao-moo-krob", 1, "ไม่เผ็ด"]]],
  [11, "ready", 19, "นัท", "7788", [["khao-pad-kung", 1], ["nam-plao", 1]], { payment_method: "wallet" }],
  [12, "preparing", 14, "เบล", "3021", [["kaprao-moo-sab", 1], ["cha-thai-yen", 1]]],
  [13, "preparing", 11, "โอ๊ต", "5147", [["kaprao-moo-krob", 3, "แยกข้าว 1 กล่อง"]]],
  [14, "confirmed", 8, "จูน", "9265", [["khao-khai-jeow", 1]], { payment_method: "card" }],
  [15, "pending", 6, "ภูมิ", "4390", [["kaprao-moo-krob", 1], ["nam-plao", 2]]],
  [16, "pending", 3, "ขิม", "6034", [["khao-pad-kung", 2, "ไม่ใส่ต้นหอม"]]],
  [17, "pending", 1, "ทราย", "2857", [["kaprao-moo-sab", 1]]],
];

/** Builds one order and its queue ticket the same way the backend does on checkout. */
export function buildOrder({ menus, queueNumber, status, orderedAt, customerName, receiveCode, items, extra = {} }) {
  const lines = items.map(([menuId, quantity, note = ""]) => {
    const item = menus.find((m) => m._id === menuId);
    return {
      menu_id: menuId,
      name: item.name,
      price: item.price,
      quantity,
      total_price: item.price * quantity,
      note,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.total_price, 0);
  const discount = extra.discount ?? 0;
  const orderId = `order-${queueNumber}-${orderedAt}`;
  // Seeded history: the ticket was called ~12 minutes after ordering and collected 3 minutes later.
  const calledAt = ["ready", "completed"].includes(status) ? orderedAt + 12 * MINUTE : null;
  const completedAt = status === "completed" ? orderedAt + 15 * MINUTE : null;

  const order = {
    _id: orderId,
    order_number: `MQ${2100 + queueNumber}`,
    // MOCK: the API populates customer_id with { name, email }; only the name is shown here.
    customer: { name: customerName },
    store_id: MERCHANT_STORE_ID,
    items: lines,
    subtotal,
    service_fee: 0,
    discount,
    total_price: subtotal - discount,
    payment_method: extra.payment_method ?? "promptpay",
    status,
    order_date: orderedAt,
    receive_time: completedAt,
  };
  const queue = {
    _id: `queue-${orderId}`,
    order_id: orderId,
    store_id: MERCHANT_STORE_ID,
    queue_number: queueNumber,
    receive_code: receiveCode,
    status: QUEUE_STATUS_FOR_ORDER[status],
    called_at: calledAt,
    completed_at: completedAt,
  };
  return { order, queue };
}

export function createSeedState(now) {
  const menus = seedMenus();
  const built = SEED_ORDERS.map(([queueNumber, status, minutesAgo, customerName, receiveCode, items, extra]) =>
    buildOrder({
      menus,
      queueNumber,
      status,
      orderedAt: now - minutesAgo * MINUTE,
      customerName,
      receiveCode,
      items,
      extra,
    }),
  );
  // The two tickets on the "ready" shelf were only just called.
  built.filter(({ order }) => order.status === "ready").forEach(({ queue }, index) => {
    queue.called_at = now - (6 - index * 3) * MINUTE;
  });

  return {
    session: null,
    store: seedStore(),
    menus,
    orders: built.map((b) => b.order).reverse(),
    queues: built.map((b) => b.queue),
  };
}

/** MOCK: walk-up names for simulated orders (there is no customer app feeding this board yet). */
export const SIMULATED_CUSTOMERS = ["ปาล์ม", "ไอซ์", "แบม", "ก้อง", "เฟิร์น", "ต่อ", "หมิว", "โบ๊ท"];
