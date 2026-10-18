const express = require("express");
const { registerOrderRoutes } = require("./src/orders/routes");
const { routeNotFound, errorHandler } = require("./src/http-errors");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_VERSION = "1.0";

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

// Health check does not touch orders, so it stays useful when orders are slow or broken.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    version: API_VERSION,
  });
});

registerOrderRoutes(app);

app.use(routeNotFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Orders API is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
