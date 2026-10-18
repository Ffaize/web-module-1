// Sends the same requests to the original app.js (from the first commit)
// and to the current app, then prints whether the responses match.
// Usage: node scripts/compare-with-original.js
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ORIGINAL_COMMIT = "2baea8e";
const root = path.join(__dirname, "..");
const originalFile = path.join(root, "original-app.tmp.js");

fs.writeFileSync(originalFile, execSync(`git show ${ORIGINAL_COMMIT}:app.js`, { cwd: root }));
console.log = () => {}; // the original app logs a line on every request

const originalApp = require(originalFile);
const currentApp = require(path.join(root, "app.js"));

const json = "application/json";
const tooBig = JSON.stringify({ customerName: "x".repeat(40000), items: [] });
const cases = [
  ["GET", "/health"],
  ["HEAD", "/health"],
  ["GET", "/orders"],
  ["GET", "/orders/"],
  ["POST", "/orders", '{"customerName":"Ann","items":[{"name":"A","quantity":2,"price":19.99}]}', json],
  ["POST", "/orders", '{"customerName":"Ann","items":[{"name":"A","quantity":1,"price":1}]}', "text/plain"],
  ["POST", "/orders", "", json],
  ["POST", "/orders", "null", json],
  ["POST", "/orders", '"text"', json],
  ["POST", "/orders", tooBig, json],
  ["POST", "/orders", '{"customerName":5,"items":"x"}', json],
  ["GET", "/orders/ord-missing"],
  ["GET", "/orders/a/b"],
  ["DELETE", "/orders"],
  ["PUT", "/orders/x", "{}", json],
  ["GET", "/ORDERS"],
  ["OPTIONS", "/orders"],
  ["PATCH", "/health"],
];

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function describeResponse(server, [method, url, body, type]) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${url}`, {
    method,
    body,
    headers: type ? { "content-type": type } : {},
  });
  const headers = ["content-type", "location", "allow"]
    .map((name) => `${name}=${response.headers.get(name)}`)
    .join(" ");
  const text = await response.text();
  return `${response.status} ${headers} ${text}`.replace(/ord-[0-9a-f]{8}/g, "ord-<id>");
}

async function main() {
  const servers = [await listen(originalApp), await listen(currentApp)];
  let differences = 0;

  try {
    for (const testCase of cases) {
      const [before, after] = await Promise.all(servers.map((s) => describeResponse(s, testCase)));
      const same = before === after;
      if (!same) differences += 1;
      process.stdout.write(`${same ? "SAME" : "DIFF"}  ${testCase[0]} ${testCase[1]} -> ${before.split(" ")[0]}\n`);
      if (!same) process.stdout.write(`      before: ${before}\n      after:  ${after}\n`);
    }
  } finally {
    servers.forEach((server) => server.close());
    fs.rmSync(originalFile, { force: true });
  }

  process.stdout.write(`\nDifferences: ${differences} of ${cases.length}\n`);
  process.exitCode = differences === 0 ? 0 : 1;
}

main();
