// In-memory storage. Orders live only while the process runs.
// Knows nothing about HTTP or validation.
const orders = [];

function add(order) {
  orders.push(order);
  return order;
}

function list() {
  return orders;
}

function findById(id) {
  return orders.find((order) => order.id === id);
}

function remove(id) {
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) return false;

  orders.splice(index, 1);
  return true;
}

module.exports = { add, list, findById, remove };
