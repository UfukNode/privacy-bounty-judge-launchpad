const assert = require("node:assert/strict");
const test = require("node:test");
const evm = require("../lib/evm");

test("function selectors match expected signatures", () => {
  assert.equal(evm.selector("createBounty(string,string,uint256)"), "0x2bfa7d60");
  assert.equal(evm.selector("submitCommitment(uint256,bytes32)"), "0xe6a3d9dc");
  assert.equal(evm.selector("revealAnswer(uint256,string,bytes32)"), "0xd5198a71");
  assert.equal(evm.selector("judgeAll(uint256,bytes)"), "0xd8964ee9");
  assert.equal(evm.selector("finalizeWinner(uint256,uint256)"), "0x5a7722f1");
  assert.equal(evm.selector("getSubmission(uint256,uint256)"), "0xb7ed7071");
  assert.equal(evm.selector("deposit(uint256)"), "0xb6b55f25");
  assert.equal(evm.selector("balanceOf(address)"), "0x70a08231");
  assert.equal(evm.selector("lockUntil(address)"), "0xeba74ee9");
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

test("decodes getBounty status fields from ABI return data", () => {
  const result = evm.concatHex([
    evm.addressWord("0xbc4ebf8bb59ceb2774658c1b30eb2e2c257ac7c7"),
    evm.word(320n),
    evm.word(384n),
    evm.word(1000000000000000n),
    evm.word(1780000000n),
    evm.word(1n),
    evm.word(0n),
    evm.word(2n),
    evm.word(0n),
    evm.word(448n)
  ]);

  assert.deepEqual(evm.decodeGetBountyStatus(result), {
    owner: "0xbc4ebf8bb59ceb2774658c1b30eb2e2c257ac7c7",
    reward: 1000000000000000n,
    deadline: 1780000000n,
    judged: true,
    finalized: false,
    submissionCount: 2n,
    winnerIndex: 0n
  });
});

test("decodes getSubmission return data", () => {
  const answerTail = evm.dynamicString("hello");
  const result = evm.concatHex([
    evm.addressWord("0xbc4ebf8bb59ceb2774658c1b30eb2e2c257ac7c7"),
    `0x${"11".repeat(32)}`,
    evm.word(128n),
    evm.boolWord(true),
    answerTail
  ]);

  assert.deepEqual(evm.decodeGetSubmission(result), {
    submitter: "0xbc4ebf8bb59ceb2774658c1b30eb2e2c257ac7c7",
    commitment: `0x${"11".repeat(32)}`,
    answer: "hello",
    revealed: true
  });
});

test("builds a non-empty Ritual LLM input payload", () => {
  const input = evm.buildJudgeAllLlmInput({
    executorAddress: "0xB42e435c4252A5a2E7440e37B609F00c61a0c91B",
    title: "Privacy Preserving AI Bounty Judge",
    rubric: "Judge correctness and privacy reasoning.",
    submissions: [
      {
        index: 0,
        submitter: "0xbc4ebf8bb59ceb2774658c1b30eb2e2c257ac7c7",
        answer: "Use commit-reveal."
      }
    ]
  });

  assert.match(input, /^0x[0-9a-f]+$/i);
  assert.ok(input.length > 1000);
  assert.match(input, /b42e435c4252a5a2e7440e37b609f00c61a0c91b/i);
  assert.match(input, /7a61692d6f72672f474c4d2d342e372d465038/i);
});

test("encodes RitualWallet funding calls", () => {
  const user = "0xbc4ebf8bb59ceb2774658c1b30eb2e2c257ac7c7";

  assert.equal(
    evm.encodeRitualWalletDeposit({ lockDuration: 100000n }),
    `0xb6b55f25${"0".repeat(59)}186a0`
  );
  assert.equal(evm.encodeRitualWalletBalanceOf({ user }).slice(0, 10), "0x70a08231");
  assert.equal(evm.encodeRitualWalletLockUntil({ user }).slice(0, 10), "0xeba74ee9");
  assert.equal(evm.decodeUint256(evm.word(123n)), 123n);
});
