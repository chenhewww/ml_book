import assert from "node:assert/strict";
import test from "node:test";
import { createAppServer } from "../server/app.js";
import { HOST } from "../server/config.js";

let server;
let baseUrl;

test.before(async () => {
  server = createAppServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://${HOST}:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("book routes serve the reader shell", async () => {
  const response = await fetch(`${baseUrl}/book/linear-regression/opening`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  const html = await response.text();
  assert.match(html, /id="sectionToc"/);
  assert.match(html, /class="experiment-details"/);
});

test("experiment API still provides snapshots for inline figures", async () => {
  const response = await fetch(`${baseUrl}/api/experiment?algorithmId=linear_regression&learningRate=0.12`);
  assert.equal(response.status, 200);
  const experiment = await response.json();
  assert.equal(experiment.algorithmId, "linear_regression");
  assert.ok(experiment.snapshots.length > 1);
  assert.ok(experiment.dataset.length > 1);
});
