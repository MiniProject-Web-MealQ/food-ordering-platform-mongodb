import { QUEUE_STATUS_FOR_ORDER } from "./status.js";

/**
 * API ของร้านค้าตอบกลับเป็น camelCase (ดู storeView/menuView ใน publicController.js และ
 * orderView ใน orderController.js) แต่แอปเก็บชื่อแบบ snake_case ตาม model ของ backend
 * ข้อมูลที่ได้จาก API ทุกก้อนจึงต้องผ่านฟังก์ชันในไฟล์นี้ และ body ที่ส่งไปสร้างด้วยฟังก์ชัน *ToApi
 */

function time(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function storeFromApi(store) {
  return {
    _id: store.id,
    client_id: store.clientId ?? null,
    name: store.name ?? "",
    description: store.description ?? "",
    phone: store.phone ?? "",
    coordinates: store.coordinates || null,
    address: store.address ?? {},
    rating: store.rating ?? null,
    is_open: Boolean(store.manualOpen ?? store.isOpen),
    effective_open: Boolean(store.isOpen),
    status: store.status || "active",
    status_note: store.statusNote || null,
    opening_hours: {
      automatic: Boolean(store.openingHours?.automatic),
      open_time: store.openingHours?.open_time ?? "",
      close_time: store.openingHours?.close_time ?? "",
    },
    queue: {
      max_queue: Number(store.queue?.maxQueue) || 50,
    },
    // รูปโปรไฟล์ร้าน (Store.logo) และแบนเนอร์ (Store.cover_image) ที่แสดงในหน้าร้านฝั่งลูกค้า
    logo: store.logo || null,
    cover_image: store.coverImage || null,
  };
}

export function menuFromApi(menu) {
  return {
    _id: menu.id,
    client_id: menu.clientId ?? null,
    store_id: menu.storeId,
    name: menu.name ?? "",
    description: menu.description ?? "",
    cuisine: menu.cuisine || "thai", ingredients: menu.ingredients || [],
    category: menu.category ?? "",
    price: Number(menu.price) || 0,
    image: menu.image ?? null,
    cook_time: Number(menu.cookTime) || 0,
    is_available: menu.isAvailable !== false,
    sold_quantity: Number(menu.soldQuantity) || 0,
    option_groups: (menu.optionGroups ?? []).map(optionGroupFromApi),
  };
}

/** กลุ่มตัวเลือกเสริมของเมนู (ดู option-groups.js) */
function optionGroupFromApi(group) {
  return {
    id: group.id,
    label: group.label ?? "",
    required: Boolean(group.required),
    multiple: Boolean(group.multiple),
    min: Number(group.min) || 0,
    max: Number(group.max) || 1,
    options: (group.options ?? []).map((option) => ({
      id: option.id,
      label: option.label ?? "",
      price: Number(option.price) || 0,
      default: Boolean(option.default),
      is_available: option.isAvailable !== false && option.is_available !== false,
    })),
  };
}

/**
 * แปลงออเดอร์ 1 รายการจาก API เป็น Order + ตั๋วคิว (Queue) ตามที่ model เก็บ
 * ใช้เวลาในคิวและเวลารับอาหารจาก API พร้อม fallback สำหรับข้อมูลเก่า
 */
export function orderFromApi(order) {
  const updatedAt = time(order.updatedAt);
  const handedOver = time(order.receiveTime) ?? (order.status === "completed" ? updatedAt : null);
  const calledAt = time(order.queueCalledAt) ?? (order.status === "ready" ? updatedAt : null);
  const completedAt = time(order.queueCompletedAt) ?? handedOver;
  return {
    order: {
      _id: order.id,
      order_number: order.orderNumber,
      customer: { name: order.customer?.name ?? "ลูกค้า" },
      items: (order.items ?? []).map((item) => ({
        menu_id: item.menuId,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
        total_price: Number(item.totalPrice) || 0,
        note: item.note ?? "",
        // ตัวเลือกเสริมที่ลูกค้าเลือก { groupId: [optionId] } แปลงเป็นชื่อด้วย selectionLabels()
        selections: item.selections ?? {},
        selected_options: item.selectedOptions,
      })),
      subtotal: Number(order.subtotal) || 0,
      service_fee: Number(order.serviceFee) || 0,
      discount: Number(order.discount) || 0,
      total_price: Number(order.totalPrice) || 0,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus,
      payment_mode: order.paymentMode,
      status: order.status,
      order_date: time(order.createdAt),
      receive_time: handedOver,
    },
    queue: {
      order_id: order.id,
      queue_number: order.queueNumber ?? 0,
      receive_code: order.pickupCode ?? "",
      status: QUEUE_STATUS_FOR_ORDER[order.status],
      called_at: calledAt,
      completed_at: completedAt,
    },
  };
}

export function ordersFromApi(list) {
  const built = (list ?? []).map(orderFromApi);
  return { orders: built.map((b) => b.order), queues: built.map((b) => b.queue) };
}

export function menuToApi(fields) {
  const body = {};
  if (fields.name !== undefined) body.name = fields.name;
  if (fields.description !== undefined) body.description = fields.description;
  if (fields.cuisine !== undefined) body.cuisine = fields.cuisine;
  if (fields.ingredients !== undefined) body.ingredients = fields.ingredients.map((row) => ({ ingredientId: row.ingredient_id, quantity: Number(row.quantity), unit: row.unit }));
  if (fields.category !== undefined) body.category = fields.category;
  if (fields.price !== undefined) body.price = fields.price;
  if (fields.image !== undefined) body.image = fields.image;
  if (fields.cook_time !== undefined) body.cookTime = fields.cook_time;
  if (fields.is_available !== undefined) body.isAvailable = fields.is_available;
  if (fields.option_groups !== undefined) {
    body.optionGroups = fields.option_groups.map((group) => ({
      id: group.id,
      label: group.label,
      required: group.required,
      multiple: group.multiple,
      min: group.min,
      max: group.max,
      options: group.options.map((option) => ({
        id: option.id,
        label: option.label,
        price: option.price,
        default: option.default,
        isAvailable: option.is_available,
      })),
    }));
  }
  return body;
}

/** Map editable store fields to the API contract. */
export function storeToApi(changes) {
  const body = {};
  if (changes.name !== undefined) body.name = changes.name;
  if (changes.description !== undefined) body.description = changes.description;
  if (changes.phone !== undefined) body.phone = changes.phone;
  if (changes.coordinates !== undefined) body.coordinates = changes.coordinates;
  if (changes.is_open !== undefined) body.isOpen = changes.is_open;
  if (changes.logo !== undefined) body.logo = changes.logo;
  if (changes.cover_image !== undefined) body.coverImage = changes.cover_image;
  if (changes.opening_hours) {
    body.openingHours = { automatic: Boolean(changes.opening_hours.automatic), open: changes.opening_hours.open_time, close: changes.opening_hours.close_time };
  }
  if (changes.address) {
    body.address = {
      detail: changes.address.detail,
      province: changes.address.province,
      district: changes.address.district,
      postalCode: changes.address.postal_code,
    };
  }
  if (changes.queue?.max_queue !== undefined) body.maxQueue = changes.queue.max_queue;
  return body;
}
