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
    assert.match(html, /Privacy Bounty Operator/);
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

test("compiles Solidity from the API endpoint", async () => {
  const server = createStaticServer({ rootDir: path.resolve(__dirname, "..") });
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/api/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractName: "AIJudge",
        aiJudgeSource: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AIJudge {
    function submitCommitment(uint256, bytes32) external {}
}
`,
        precompileConsumerSource: ""
      })
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.contractName, "AIJudge");
    assert.match(result.artifact.bytecode, /^0x[0-9a-f]+$/i);
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
