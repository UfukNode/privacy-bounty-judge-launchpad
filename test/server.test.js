const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { createStaticServer, getContentType, resolveRequestPath } = require("../serve");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

test("serves the static app index", async () => {
  const server = createStaticServer({ rootDir: path.resolve(__dirname, "..") });
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(html, /Privacy-Preserving Bounty Judge/);
  } finally {
    await close(server);
  }
});

test("returns 404 for missing files", async () => {
  const server = createStaticServer({ rootDir: path.resolve(__dirname, "..") });
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/missing-file.txt`);
    assert.equal(response.status, 404);
  } finally {
    await close(server);
  }
});

test("content type helper covers expected static assets", () => {
  assert.equal(getContentType("index.html"), "text/html; charset=utf-8");
  assert.equal(getContentType("styles.css"), "text/css; charset=utf-8");
  assert.equal(getContentType("app.js"), "text/javascript; charset=utf-8");
  assert.equal(getContentType("logo.jpg"), "image/jpeg");
});

test("request path resolution stays inside the project root", () => {
  const root = path.resolve(__dirname, "..");

  assert.equal(resolveRequestPath(root, "/"), path.join(root, "index.html"));
  assert.equal(resolveRequestPath(root, "/templates/TEST_PLAN.md"), path.join(root, "templates/TEST_PLAN.md"));
  assert.equal(resolveRequestPath(root, "/../../etc/passwd"), null);
});
