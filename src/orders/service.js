const { randomUUID } = require("node:crypto");
const store = require("./store");

const DEFAULT_STATUS = "created";

function makeOrderId() {
  return `ord-${randomUUID().slice(0, 8)}`;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateTotal(items) {
  const sum = items.reduce((total, item) => total + item.quantity * item.price, 0);
  return roundMoney(sum);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFilledString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validateOrder(body) {
  if (!isObject(body)) {
    return ["Request body must be a JSON object"];
  }

  const errors = [];

  if (!isFilledString(body.customerName)) {
    errors.push("customerName is required");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("At least one item is required");
    return errors;
  }

  body.items.forEach((item, i) => {
    if (!isObject(item)) {
      errors.push(`items[${i}] must be an object`);
      return;
    }
    if (!isFilledString(item.name)) {
      errors.push(`items[${i}].name is required`);
    }
    if (!isPositiveNumber(item.quantity)) {
      errors.push(`items[${i}].quantity must be greater than zero`);
    }
    if (!isPositiveNumber(item.price)) {
      errors.push(`items[${i}].price must be greater than zero`);
    }
  });

  return errors;
}

// id, total and status are always set here, whatever the client sends
function createOrder(body) {
  const errors = validateOrder(body);
  if (errors.length > 0) {
    return { errors };
  }

  const items = body.items.map((item) => ({
    name: item.name.trim(),
    quantity: item.quantity,
    price: item.price,
  }));

  const order = store.add({
    id: makeOrderId(),
    customerName: body.customerName.trim(),
    items,
    total: calculateTotal(items),
    status: DEFAULT_STATUS,
  });

  return { order };
}

function getAllOrders() {
  return store.list();
}

function getOrder(id) {
  return store.findById(id);
}

function deleteOrder(id) {
  return store.remove(id);
}

module.exports = { createOrder, getAllOrders, getOrder, deleteOrder };
