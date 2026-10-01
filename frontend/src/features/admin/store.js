import { createContext, use } from "react";
import { createSeedState } from "./mock-data";

/**
 * MOCK: state ของฝั่งผู้ดูแลระบบ เก็บใน localStorage key "mealq.admin.v1"
 * ทุก action มีคอมเมนต์บอก endpoint ที่ควรมาแทนเมื่อ backend ทำ API กลุ่ม /api/v1/admin/* แล้ว
 * ทุกการแก้ไขบันทึกลง state.activity ด้วย (หน้า "บันทึกการทำงาน")
 */

export const STORAGE_KEY = "mealq.admin.v1";

export const AdminContext = createContext(null);

function isValidState(state) {
  return (
    state &&
    typeof state === "object" &&
    Array.isArray(state.users) &&
    Array.isArray(state.stores) &&
    Array.isArray(state.orders) &&
    Array.isArray(state.promotions) &&
    Array.isArray(state.wallet_transactions) &&
    state.settings
  );
}

export function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidState(stored)) return stored;
  } catch {
    // ข้อมูลเสียหรือเบราว์เซอร์บล็อก storage: เริ่มจากข้อมูลจำลองชุดใหม่
  }
  return createSeedState(Date.now());
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage เต็มหรือถูกบล็อก: ใช้งานต่อได้เฉพาะแท็บนี้
  }
}

/** MOCK: หน้า login อยู่นอก <AdminProvider> จึงเขียน session ลง storage ตรง ๆ (รอ POST /auth/login portal ADMIN) */
export function signIn(session) {
  saveState({ ...loadState(), session });
}

export function readSession() {
  return loadState().session;
}

function log(state, action, entry) {
  return {
    ...state,
    activity: [
      { _id: action.logId, at: action.at, actor_id: state.session?.user_id ?? null, ...entry },
      ...state.activity,
    ],
  };
}

function patch(list, id, changes, key = "_id") {
  return list.map((item) => (item[key] === id ? { ...item, ...(typeof changes === "function" ? changes(item) : changes) } : item));
}

const STORE_STATUS_ACTION = {
  active: "store.activate",
  suspended: "store.suspend",
  rejected: "store.reject",
};

export function reducer(state, action) {
  switch (action.type) {
    case "session/logout":
      return { ...state, session: null };

    // MOCK: PATCH /admin/stores/:id { status, reason }
    case "store/setStatus": {
      const store = state.stores.find((s) => s._id === action.storeId);
      if (!store) return state;
      const approving = store.status === "pending" && action.status === "active";
      const next = {
        ...state,
        stores: patch(state.stores, store._id, {
          status: action.status,
          status_note: action.reason || null,
          // ร้านที่ถูกระงับหรือถูกปฏิเสธต้องปิดรับออเดอร์ด้วย
          is_open: action.status === "active" ? store.is_open : false,
        }),
      };
      return log(next, action, {
        action: approving ? "store.approve" : STORE_STATUS_ACTION[action.status],
        target_type: "store",
        target_id: store._id,
        target_label: store.name,
        detail: action.reason || null,
      });
    }

    // MOCK: PATCH /admin/stores/:id { isOpen: false, reason }
    case "store/forceClose": {
      const store = state.stores.find((s) => s._id === action.storeId);
      if (!store?.is_open) return state;
      const next = { ...state, stores: patch(state.stores, store._id, { is_open: false }) };
      return log(next, action, { action: "store.forceClose", target_type: "store", target_id: store._id, target_label: store.name, detail: action.reason });
    }

    // MOCK: PATCH /admin/stores/:id { address, maxQueue }
    case "store/update": {
      const store = state.stores.find((s) => s._id === action.storeId);
      if (!store) return state;
      const next = {
        ...state,
        stores: patch(state.stores, store._id, {
          address: { ...store.address, detail: action.address },
          queue: { ...store.queue, max_queue: action.maxQueue },
        }),
      };
      return log(next, action, {
        action: "store.update",
        target_type: "store",
        target_id: store._id,
        target_label: store.name,
        detail: `จุดรับอาหาร: ${action.address} · คิวสูงสุด: ${action.maxQueue}`,
      });
    }

    // MOCK: PATCH /admin/users/:id { status, reason }
    case "user/setStatus": {
      const user = state.users.find((u) => u._id === action.userId);
      if (!user || user._id === state.session?.user_id) return state;
      const next = { ...state, users: patch(state.users, user._id, { status: action.status, status_note: action.reason || null }) };
      return log(next, action, {
        action: action.status === "suspended" ? "user.suspend" : "user.activate",
        target_type: "user",
        target_id: user._id,
        target_label: user.name,
        detail: action.reason || null,
      });
    }

    // MOCK: PATCH /admin/users/:id { role }
    case "user/setRole": {
      const user = state.users.find((u) => u._id === action.userId);
      if (!user || user._id === state.session?.user_id || user.role === action.role) return state;
      const next = { ...state, users: patch(state.users, user._id, { role: action.role }) };
      return log(next, action, {
        action: "user.role",
        target_type: "user",
        target_id: user._id,
        target_label: user.name,
        detail: `${user.role} → ${action.role}`,
      });
    }

    // MOCK: POST /admin/users/:id/password-reset
    case "user/resetPassword": {
      const user = state.users.find((u) => u._id === action.userId);
      if (!user) return state;
      return log(state, action, { action: "user.resetPassword", target_type: "user", target_id: user._id, target_label: user.name, detail: `ส่งไปที่ ${user.email}` });
    }

    // MOCK: PATCH /auth/password { currentPassword, newPassword } (ตรวจรหัสเดิมที่หน้าจอก่อนแล้ว)
    case "user/changePassword": {
      const user = state.users.find((u) => u._id === action.userId);
      if (!user) return state;
      const next = {
        ...state,
        users: patch(state.users, user._id, { password: action.password, must_change_password: false }),
        session: state.session?.user_id === user._id ? { ...state.session, must_change_password: false } : state.session,
      };
      return log(next, action, { action: "user.changePassword", target_type: "user", target_id: user._id, target_label: user.name, detail: null });
    }

    // MOCK: POST /admin/users { name, email, phone, password, role: "admin" }
    case "user/addAdmin": {
      const next = { ...state, users: [action.user, ...state.users] };
      return log(next, action, {
        action: "user.addAdmin",
        target_type: "user",
        target_id: action.user._id,
        target_label: action.user.name,
        detail: `${action.user.email} · ต้องเปลี่ยนรหัสผ่านตอน login ครั้งแรก`,
      });
    }

    // MOCK: PATCH /admin/orders/:id/cancel { reason }
    case "order/cancel": {
      const order = state.orders.find((o) => o._id === action.orderId);
      if (!order || ["completed", "cancelled"].includes(order.status)) return state;
      const next = {
        ...state,
        orders: patch(state.orders, order._id, {
          status: "cancelled",
          updated_at: action.at,
          cancel: { by: "admin", reason: action.reason, at: action.at },
        }),
      };
      return log(next, action, { action: "order.cancel", target_type: "order", target_id: order._id, target_label: order.order_number, detail: action.reason });
    }

    // MOCK: POST /admin/orders/:id/refund { amount, method, note }
    case "order/refund": {
      const order = state.orders.find((o) => o._id === action.orderId);
      if (!order || order.status !== "cancelled" || order.refund) return state;
      const refund = { amount: action.amount, method: action.method, note: action.note, at: action.at, by: state.session?.user_id ?? null };
      let next = { ...state, orders: patch(state.orders, order._id, { refund }) };
      if (action.method === "wallet") {
        next = applyWallet(next, {
          _id: action.txId,
          user_id: order.customer_id,
          order_id: order._id,
          type: "refund",
          amount: action.amount,
          description: `คืนเงินออเดอร์ ${order.order_number}`,
          created_at: action.at,
          by: state.session?.user_id ?? null,
        });
      }
      return log(next, action, {
        action: "order.refund",
        target_type: "order",
        target_id: order._id,
        target_label: order.order_number,
        detail: `฿${action.amount} · ${action.method === "wallet" ? "เข้า Wallet" : "ช่องทางเดิม"}${action.note ? ` · ${action.note}` : ""}`,
      });
    }

    // MOCK: POST /admin/promotions
    case "promotion/add": {
      const next = { ...state, promotions: [action.promotion, ...state.promotions] };
      return log(next, action, { action: "promotion.create", target_type: "promotion", target_id: action.promotion._id, target_label: action.promotion.code, detail: action.promotion.title });
    }

    // MOCK: PATCH /admin/promotions/:id
    case "promotion/update": {
      const promo = state.promotions.find((p) => p._id === action.promotionId);
      if (!promo) return state;
      const next = { ...state, promotions: patch(state.promotions, promo._id, action.changes) };
      const toggledOnly = Object.keys(action.changes).length === 1 && "is_active" in action.changes;
      return log(next, action, {
        action: toggledOnly ? (action.changes.is_active ? "promotion.enable" : "promotion.disable") : "promotion.update",
        target_type: "promotion",
        target_id: promo._id,
        target_label: action.changes.code ?? promo.code,
        detail: null,
      });
    }

    // MOCK: POST /admin/wallets/:userId/adjust { amount, reason }
    case "wallet/adjust": {
      const user = state.users.find((u) => u._id === action.userId);
      if (!user) return state;
      const next = applyWallet(state, {
        _id: action.txId,
        user_id: user._id,
        order_id: null,
        type: "adjust",
        amount: action.amount,
        description: action.reason,
        created_at: action.at,
        by: state.session?.user_id ?? null,
      });
      return log(next, action, {
        action: "wallet.adjust",
        target_type: "user",
        target_id: user._id,
        target_label: user.name,
        detail: `${action.amount > 0 ? "+" : ""}${action.amount} บาท · ${action.reason}`,
      });
    }

    // MOCK: PATCH /admin/settings
    case "settings/update": {
      const next = { ...state, settings: { ...state.settings, ...action.changes } };
      return log(next, action, { action: "settings.update", target_type: "settings", target_id: "settings", target_label: "ตั้งค่าระบบ", detail: action.summary });
    }

    case "demo/reset":
      return { ...action.state, session: state.session };

    default:
      throw new Error(`Unknown admin action: ${action.type}`);
  }
}

/** เพิ่มรายการ Wallet และปรับยอดคงเหลือ (ยอดติดลบไม่ได้) */
function applyWallet(state, tx) {
  const wallet = state.wallets.find((w) => w.user_id === tx.user_id) ?? { user_id: tx.user_id, balance: 0 };
  const before = wallet.balance;
  const after = Math.max(0, before + tx.amount);
  const wallets = state.wallets.some((w) => w.user_id === tx.user_id)
    ? patch(state.wallets, tx.user_id, { balance: after }, "user_id")
    : [...state.wallets, { user_id: tx.user_id, balance: after }];
  return {
    ...state,
    wallets,
    wallet_transactions: [{ ...tx, balance_before: before, balance_after: after }, ...state.wallet_transactions],
  };
}

export function useAdmin() {
  const context = use(AdminContext);
  if (!context) throw new Error("useAdmin must be used inside <AdminProvider>");
  return context;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** สร้าง action โดยใส่ id เวลา และค่าสุ่มให้ตรงนี้ reducer จะได้เป็น pure function */
export const actions = {
  setStoreStatus: (storeId, status, reason) => ({ type: "store/setStatus", storeId, status, reason, at: Date.now(), logId: uid("a") }),
  forceCloseStore: (storeId, reason) => ({ type: "store/forceClose", storeId, reason, at: Date.now(), logId: uid("a") }),
  updateStore: (storeId, address, maxQueue) => ({ type: "store/update", storeId, address, maxQueue, at: Date.now(), logId: uid("a") }),
  setUserStatus: (userId, status, reason) => ({ type: "user/setStatus", userId, status, reason, at: Date.now(), logId: uid("a") }),
  setUserRole: (userId, role) => ({ type: "user/setRole", userId, role, at: Date.now(), logId: uid("a") }),
  resetPassword: (userId) => ({ type: "user/resetPassword", userId, at: Date.now(), logId: uid("a") }),
  changePassword: (userId, password) => ({ type: "user/changePassword", userId, password, at: Date.now(), logId: uid("a") }),
  addAdmin: ({ name, email, phone, password }) => ({
    type: "user/addAdmin",
    user: {
      _id: uid("u-admin"),
      name,
      email,
      phone,
      role: "admin",
      status: "active",
      created_at: Date.now(),
      // MOCK: เก็บรหัสผ่านแบบไม่เข้ารหัสเพื่อจำลอง login เท่านั้น ระบบจริงต้องเก็บเป็น password_hash ที่ backend
      password,
      must_change_password: true,
    },
    at: Date.now(),
    logId: uid("a"),
  }),
  cancelOrder: (orderId, reason) => ({ type: "order/cancel", orderId, reason, at: Date.now(), logId: uid("a") }),
  refundOrder: (orderId, { amount, method, note }) => ({ type: "order/refund", orderId, amount, method, note, at: Date.now(), txId: uid("wt"), logId: uid("a") }),
  addPromotion: (fields) => ({
    type: "promotion/add",
    promotion: { _id: uid("p"), used_count: 0, created_at: Date.now(), ...fields },
    at: Date.now(),
    logId: uid("a"),
  }),
  updatePromotion: (promotionId, changes) => ({ type: "promotion/update", promotionId, changes, at: Date.now(), logId: uid("a") }),
  adjustWallet: (userId, amount, reason) => ({ type: "wallet/adjust", userId, amount, reason, at: Date.now(), txId: uid("wt"), logId: uid("a") }),
  updateSettings: (changes, summary) => ({ type: "settings/update", changes, summary, at: Date.now(), logId: uid("a") }),
  resetDemo: () => ({ type: "demo/reset", state: createSeedState(Date.now()) }),
};
