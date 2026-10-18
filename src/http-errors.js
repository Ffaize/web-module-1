// JSON error format shared by all routes, plus the 404 and error handlers.

function validationProblem(message, details) {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message,
      details,
    },
  };
}

function notFoundProblem() {
  return {
    error: {
      code: "ORDER_NOT_FOUND",
      message: "Order not found",
    },
  };
}

function routeNotFound(req, res) {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
    },
  });
}

// Express recognizes an error handler by its four arguments, so `next` stays.
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  // Malformed JSON from express.json() is a client error, not a server failure.
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json(
      validationProblem("Invalid JSON body", [
        "Request body must contain valid JSON",
      ]),
    );
  }

  console.error(error);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error",
    },
  });
}

module.exports = { validationProblem, notFoundProblem, routeNotFound, errorHandler };
