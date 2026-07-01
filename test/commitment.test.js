const assert = require("node:assert/strict");
const test = require("node:test");
const tools = require("../lib/commitment");

test("keccak256 matches Ethereum known vectors", () => {
  assert.equal(
    tools.keccak256Hex(new Uint8Array()),
    "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
  );
  assert.equal(
    tools.keccak256Hex(new TextEncoder().encode("abc")),
    "0x4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45"
  );
});

test("minimal ABI encoder matches expected layout for the assignment tuple", () => {
  const salt = `0x${"0".repeat(63)}1`;
  const encoded = tools.abiEncodeCommitment({
    answer: "hello",
    salt,
    address: "0x000000000000000000000000000000000000dEaD",
    bountyId: 7n
  });

  assert.equal(
    tools.bytesToHex(encoded),
    [
      "0000000000000000000000000000000000000000000000000000000000000080",
      "0000000000000000000000000000000000000000000000000000000000000001",
      "000000000000000000000000000000000000000000000000000000000000dead",
      "0000000000000000000000000000000000000000000000000000000000000007",
      "0000000000000000000000000000000000000000000000000000000000000005",
      "68656c6c6f000000000000000000000000000000000000000000000000000000"
    ].join("")
  );
});

test("commitment output is stable for a known sample", () => {
  const salt = `0x${"0".repeat(63)}1`;

  assert.equal(
    tools.computeCommitment({
      answer: "hello",
      salt,
      address: "0x000000000000000000000000000000000000dEaD",
      bountyId: 7n
    }),
    "0xbfc64b71ef005c4e835bf5589ac87787519131afd0e9b31ac1260d976a20035b"
  );
});

test("input normalization rejects unsafe values", () => {
  assert.throws(() => tools.normalizeAddress("0x1234"), /20 bytes/);
  assert.throws(() => tools.normalizeBytes32("0x1234"), /32 bytes/);
  assert.throws(
    () =>
      tools.computeCommitment({
        answer: "x",
        salt: `0x${"0".repeat(64)}`,
        address: "0x0000000000000000000000000000000000000001",
        bountyId: -1n
      }),
    /out of range/
  );
});
