const orderService = require("./service");
const { validationProblem, notFoundProblem } = require("../http-errors");

// only public fields go to the client
function orderResponse(order) {
  return {
    id: order.id,
    customerName: order.customerName,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    total: order.total,
    status: order.status,
  };
}

// routes go straight on the app, not on express.Router():
// Router answers OPTIONS /orders with 200, the old API returned 404
function registerOrderRoutes(app) {
  app.post("/orders", (req, res) => {
    const { order, errors } = orderService.createOrder(req.body);

    if (errors) {
      return res.status(400).json(validationProblem("Invalid order", errors));
    }

    res.status(201).location(`/orders/${order.id}`).json(orderResponse(order));
  });

  app.get("/orders", (req, res) => {
    const orders = orderService.getAllOrders().map(orderResponse);
    res.status(200).json({ orders, count: orders.length });
  });

  app.get("/orders/:id", (req, res) => {
    const order = orderService.getOrder(req.params.id);

    if (!order) {
      return res.status(404).json(notFoundProblem());
    }

    res.status(200).json(orderResponse(order));
  });

  app.delete("/orders/:id", (req, res) => {
    const deleted = orderService.deleteOrder(req.params.id);

    if (!deleted) {
      return res.status(404).json(notFoundProblem());
    }

    res.status(204).send();
  });
}

module.exports = { registerOrderRoutes };
