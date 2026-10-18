// Business rules for orders: validation, normalization, total and status.
// Knows nothing about HTTP: it returns data or a list of problems.
const { randomUUID } = require("node:crypto");
const store = require("./store");

const DEFAULT_ORDER_STATUS = "created";

function makeOrderId() {
  return `ord-${randomUUID().slice(0, 8)}`;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateTotal(items) {
  return roundMoney(
    items.reduce((sum, item) => sum + item.quantity * item.price, 0),
  );
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateCreateOrder(body) {
  if (!isPlainObject(body)) {
    return ["Request body must be a JSON object"];
  }

  const problems = [];

  if (!isNonEmptyString(body.customerName)) {
    problems.push("customerName is required");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    problems.push("At least one item is required");
    return problems;
  }

  body.items.forEach((item, index) => {
    if (!isPlainObject(item)) {
      problems.push(`items[${index}] must be an object`);
      return;
    }
    if (!isNonEmptyString(item.name)) {
      problems.push(`items[${index}].name is required`);
    }
    if (!isPositiveNumber(item.quantity)) {
      problems.push(`items[${index}].quantity must be greater than zero`);
    }
    if (!isPositiveNumber(item.price)) {
      problems.push(`items[${index}].price must be greater than zero`);
    }
  });

  return problems;
}

function normalizeItems(items) {
  return items.map((item) => ({
    name: item.name.trim(),
    quantity: item.quantity,
    price: item.price,
  }));
}

// Returns { order } on success or { problems } when the input is invalid.
// The client never sets id, total or status: the server decides them.
function createOrder(input) {
  const problems = validateCreateOrder(input);
  if (problems.length > 0) return { problems };

  const items = normalizeItems(input.items);
  const order = store.add({
    id: makeOrderId(),
    customerName: input.customerName.trim(),
    items,
    total: calculateTotal(items),
    status: DEFAULT_ORDER_STATUS,
  });

  return { order };
}

// Reading and deleting have no business rules, so they go straight to the store.
module.exports = {
  createOrder,
  listOrders: store.list,
  getOrder: store.findById,
  deleteOrder: store.remove,
};
