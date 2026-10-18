// HTTP layer for /orders: reads the request, calls the service,
// and maps the result to a status code and a JSON body.
const orders = require("./service");
const { validationProblem, notFoundProblem } = require("../http-errors");

// Public shape of an order. Copies items so callers never get stored objects.
function orderResponse(order) {
  return {
    id: order.id,
    customerName: order.customerName,
    items: order.items.map(({ name, quantity, price }) => ({ name, quantity, price })),
    total: order.total,
    status: order.status,
  };
}

// Routes are registered on the app itself, not on an express.Router():
// a Router answers OPTIONS /orders with 200 + Allow, while the original API returns 404.
function registerOrderRoutes(app) {
  app.post("/orders", (req, res) => {
    const { order, problems } = orders.createOrder(req.body);

    if (problems) {
      return res.status(400).json(validationProblem("Invalid order", problems));
    }

    return res
      .status(201)
      .location(`/orders/${order.id}`)
      .json(orderResponse(order));
  });

  app.get("/orders", (req, res) => {
    const result = orders.listOrders().map(orderResponse);
    res.status(200).json({ orders: result, count: result.length });
  });

  app.get("/orders/:id", (req, res) => {
    const order = orders.getOrder(req.params.id);

    if (!order) {
      return res.status(404).json(notFoundProblem());
    }

    return res.status(200).json(orderResponse(order));
  });

  app.delete("/orders/:id", (req, res) => {
    if (!orders.deleteOrder(req.params.id)) {
      return res.status(404).json(notFoundProblem());
    }

    return res.status(204).send();
  });
}

module.exports = { registerOrderRoutes };
