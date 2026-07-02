const assert = require("node:assert/strict");
const test = require("node:test");
const evm = require("../lib/evm");

test("function selectors match expected signatures", () => {
  assert.equal(evm.selector("createBounty(string,string,uint256)"), "0x2bfa7d60");
  assert.equal(evm.selector("submitCommitment(uint256,bytes32)"), "0xe6a3d9dc");
  assert.equal(evm.selector("revealAnswer(uint256,string,bytes32)"), "0xd5198a71");
  assert.equal(evm.selector("judgeAll(uint256,bytes)"), "0xd8964ee9");
  assert.equal(evm.selector("finalizeWinner(uint256,uint256)"), "0x5a7722f1");
});

test("encodes createBounty calldata with two dynamic strings", () => {
  const data = evm.encodeCreateBounty({
    title: "Title",
    rubric: "Rubric",
    deadline: 123n
  });

  assert.equal(data.slice(0, 10), "0x2bfa7d60");
  assert.match(data, /5469746c65/);
  assert.match(data, /527562726963/);
  assert.match(data, /000000000000000000000000000000000000000000000000000000000000007b/);
});

test("encodes submitCommitment calldata", () => {
  const data = evm.encodeSubmitCommitment({
    bountyId: 7n,
    commitmentHash: `0x${"11".repeat(32)}`
  });

  assert.equal(
    data,
    `0xe6a3d9dc${"0".repeat(63)}7${"11".repeat(32)}`
  );
});

test("encodes revealAnswer dynamic string calldata", () => {
  const data = evm.encodeRevealAnswer({
    bountyId: 7n,
    answer: "hello",
    salt: `0x${"22".repeat(32)}`
  });

  assert.equal(data.slice(0, 10), "0xd5198a71");
  assert.match(data, /68656c6c6f/);
  assert.match(data, new RegExp(`${"22".repeat(32)}`));
});

test("parses raw bytecode and Hardhat artifact bytecode", () => {
  assert.equal(evm.parseArtifactBytecode("0x6000"), "0x6000");
  assert.equal(evm.parseArtifactBytecode(JSON.stringify({ bytecode: "0x6001" })), "0x6001");
  assert.equal(evm.parseArtifactBytecode(JSON.stringify({ bytecode: { object: "0x6002" } })), "0x6002");
  assert.throws(() => evm.parseArtifactBytecode("Or paste Hardhat artifact JSON / raw bytecode"), /placeholder text/);
  assert.throws(() => evm.parseArtifactBytecode("not json"), /valid JSON/);
});
