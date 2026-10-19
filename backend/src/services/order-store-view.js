// Orders retain the store identity even if its live catalogue is replaced.
function snapshotStore(store) {
  if (!store?._id || !store.name) return null;
  return { id: String(store._id), name: store.name, clientId: store.client_id || null };
}

function orderStoreView(order) {
  const populated = snapshotStore(order.store_id);
  if (populated) return populated;
  if (order.store_snapshot?.id && order.store_snapshot?.name) return {
    id: String(order.store_snapshot.id), name: order.store_snapshot.name,
    clientId: order.store_snapshot.clientId || null,
  };
  return { id: order.store_id ? String(order.store_id?._id || order.store_id) : null };
}

module.exports = { snapshotStore, orderStoreView };
