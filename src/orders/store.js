// orders live in memory and disappear after restart
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
