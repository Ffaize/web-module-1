# Repository guidance

## Project overview

This repository contains a small Orders API used in a Web Programming course.
The application uses Node.js, Express, plain JavaScript, and in-memory storage.
Keep the project easy to run and understand: Express is the only runtime
dependency, and the project needs no database, Docker, authentication, queues,
external services, TypeScript, or dependency injection framework.

## Commands

- Install dependencies with `npm install`.
- Run the contract tests with `npm test`.
- Start the API with `npm start`.
- Run the diagnostic workload with `npm run load` in another terminal.
- Compare responses with the original implementation with
  `node scripts/compare-with-original.js`.

Use Node.js 18 or newer because the tests and load script use the built-in
`fetch()` implementation.

## Project layout

- `app.js` creates the Express app, registers `/health`, the order routes and
  the error handlers, and starts the server.
- `src/orders/routes.js` handles HTTP: reads the request, calls the service and
  maps the result to a status code and JSON body.
- `src/orders/service.js` holds the business rules: validation, normalization,
  total calculation, id and status.
- `src/orders/store.js` keeps orders in memory and knows nothing about HTTP.
- `src/http-errors.js` defines the JSON error format and the 404 and error
  handlers.

Dependencies go one way: `app → routes → service → store`.

## API contract

Existing routes, request formats, response formats, and status codes are public
behavior. Preserve them unless the task explicitly requests an API change.

The API exposes:

- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `DELETE /orders/:id`
- `GET /health`

Keep `/health` independent from order processing so it remains useful when
diagnosing application behavior.

## Business rules

- `customerName` must be a non-empty string.
- An order must contain at least one item.
- Every item must have a name.
- Item quantity and price must be finite numbers greater than zero.
- The server calculates `total`; a total sent by the client is ignored.
- New orders use the `created` status.
- Invalid input returns `400` and unknown orders return `404`.
- Successful creation returns `201`; successful deletion returns `204`.
- Storage is intentionally process-local and resets when the server restarts.

## Implementation boundaries

Prefer a small number of modules with clear responsibilities. HTTP parsing and
response mapping belong near the routes; validation and total calculation are
domain concerns; storage stays independent of Express request and response
objects.

Add a new module or abstraction only when it has a clear job of its own. A
compact routes/service/store split is enough while each dependency is easy to
explain.

## Error handling and tests

Return the existing structured JSON errors rather than leaking stack traces or
raw implementation errors. Keep malformed JSON handling distinct from ordinary
validation failures.

Tests should assert externally observable behavior, not a particular module
layout. After any change, run the contract tests. If request-processing behavior
changes, also compare the load-test results by endpoint.

## Change checklist

Before finishing a change:

1. Confirm that the API contract and business rules are unchanged.
2. Run `npm test`.
3. Check that no unnecessary dependency or infrastructure was added.
4. Keep the implementation readable for students encountering the code for the
   first time.
