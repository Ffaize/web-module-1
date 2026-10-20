// Extra contract tests written BEFORE the refactoring.
// They passed against the original app.js and must keep passing after it,
// so they show that the public behavior did not change.
const { after, before, describe, test } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");

let server;
let baseUrl;

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });
}

async function createOrder(body) {
  return request("/orders", { method: "POST", body: JSON.stringify(body) });
}

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("Orders API contract details", () => {
  test("health returns status and version, without x-powered-by", async () => {
    const response = await request("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", version: "1.0" });
    assert.equal(response.headers.get("x-powered-by"), null);
  });

  test("created order has exactly the public fields", async () => {
    const response = await createOrder({
      customerName: "Bo",
      items: [{ name: "  Mouse  ", quantity: 3, price: 0.1, color: "red" }],
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("location"), `/orders/${body.id}`);
    assert.deepEqual(Object.keys(body).sort(), ["customerName", "id", "items", "status", "total"]);
    assert.deepEqual(body.items, [{ name: "Mouse", quantity: 3, price: 0.1 }]);
    assert.equal(body.total, 0.3);
    assert.equal(body.status, "created");
  });

  test("list returns orders with count", async () => {
    const response = await request("/orders");
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(body).sort(), ["count", "orders"]);
    assert.equal(body.count, body.orders.length);
  });

  test("validation errors list every problem in order", async () => {
    const response = await createOrder({
      customerName: "   ",
      items: [null, { name: "", quantity: "2", price: 0 }, { name: "Ok", quantity: Infinity, price: -1 }],
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid order",
        details: [
          "customerName is required",
          "items[0] must be an object",
          "items[1].name is required",
          "items[1].quantity must be greater than zero",
          "items[1].price must be greater than zero",
          "items[2].quantity must be greater than zero",
          "items[2].price must be greater than zero",
        ],
      },
    });
  });

  test("non-object body and missing items are rejected", async () => {
    const arrayBody = await createOrder([]);
    assert.equal(arrayBody.status, 400);
    assert.deepEqual((await arrayBody.json()).error.details, ["Request body must be a JSON object"]);

    const noItems = await createOrder({ customerName: "Alex" });
    assert.equal(noItems.status, 400);
    assert.deepEqual((await noItems.json()).error.details, ["At least one item is required"]);
  });

  test("malformed JSON returns a distinct 400 error", async () => {
    const response = await request("/orders", { method: "POST", body: "{bad json" });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid JSON body",
        details: ["Request body must contain valid JSON"],
      },
    });
  });

  test("deleting an unknown order returns 404", async () => {
    const response = await request("/orders/ord-missing", { method: "DELETE" });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: "ORDER_NOT_FOUND", message: "Order not found" },
    });
  });

  test("unknown route returns ROUTE_NOT_FOUND", async () => {
    const response = await request("/nope");

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: "ROUTE_NOT_FOUND", message: "Route not found" },
    });
  });

  // Found by comparing old and new servers: express.Router() would answer 200 here.
  test("OPTIONS on orders is not a route and returns 404", async () => {
    const response = await request("/orders", { method: "OPTIONS" });

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, "ROUTE_NOT_FOUND");
  });

  test("an order can be deleted only once", async () => {
    const created = await (await createOrder({
      customerName: "Alex",
      items: [{ name: "Cable", quantity: 1, price: 5 }],
    })).json();

    const first = await request(`/orders/${created.id}`, { method: "DELETE" });
    const second = await request(`/orders/${created.id}`, { method: "DELETE" });

    assert.equal(first.status, 204);
    assert.equal(second.status, 404);
  });
});
