import { QUEUE_STATUS_FOR_ORDER } from "./status";

/**
 * The merchant API answers in camelCase (see storeView/menuView in publicController.js and
 * orderView in orderController.js). The app keeps the backend models' snake_case names, so every
 * response goes through these functions and every request body is built by the *ToApi ones.
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
    address: store.address ?? {},
    rating: store.rating ?? null,
    is_open: Boolean(store.isOpen),
    opening_hours: {
      open_time: store.openingHours?.open_time ?? "",
      close_time: store.openingHours?.close_time ?? "",
    },
  };
}

export function menuFromApi(menu) {
  return {
    _id: menu.id,
    client_id: menu.clientId ?? null,
    store_id: menu.storeId,
    name: menu.name ?? "",
    description: menu.description ?? "",
    category: menu.category ?? "",
    price: Number(menu.price) || 0,
    image: menu.image ?? null,
    cook_time: Number(menu.cookTime) || 0,
    is_available: menu.isAvailable !== false,
    sold_quantity: Number(menu.soldQuantity) || 0,
  };
}

/**
 * One API order becomes an Order and its Queue ticket, as the models store them.
 * TODO(api): the API does not return Queue.called_at / completed_at or Order.receive_time, so they are
 * taken from updatedAt, which is exact for the latest step (the time the order became ready
 * or was handed over) and unknown for earlier ones.
 */
export function orderFromApi(order) {
  const updatedAt = time(order.updatedAt);
  const handedOver = order.status === "completed" ? updatedAt : null;
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
      })),
      subtotal: Number(order.subtotal) || 0,
      service_fee: Number(order.serviceFee) || 0,
      discount: Number(order.discount) || 0,
      total_price: Number(order.totalPrice) || 0,
      payment_method: order.paymentMethod,
      status: order.status,
      order_date: time(order.createdAt),
      receive_time: handedOver,
    },
    queue: {
      order_id: order.id,
      queue_number: order.queueNumber ?? 0,
      receive_code: order.pickupCode ?? "",
      status: QUEUE_STATUS_FOR_ORDER[order.status],
      called_at: order.status === "ready" ? updatedAt : null,
      completed_at: handedOver,
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
  if (fields.category !== undefined) body.category = fields.category;
  if (fields.price !== undefined) body.price = fields.price;
  if (fields.image !== undefined) body.image = fields.image;
  if (fields.cook_time !== undefined) body.cookTime = fields.cook_time;
  if (fields.is_available !== undefined) body.isAvailable = fields.is_available;
  return body;
}

/** PATCH /merchant/store only accepts name, description, phone, isOpen and openingHours. */
export function storeToApi(changes) {
  const body = {};
  if (changes.name !== undefined) body.name = changes.name;
  if (changes.description !== undefined) body.description = changes.description;
  if (changes.phone !== undefined) body.phone = changes.phone;
  if (changes.is_open !== undefined) body.isOpen = changes.is_open;
  if (changes.opening_hours) {
    body.openingHours = { open: changes.opening_hours.open_time, close: changes.opening_hours.close_time };
  }
  return body;
}
