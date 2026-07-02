(function init(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./commitment"));
  } else {
    root.EvmTools = factory(root.CommitmentTools);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function factory(commitment) {
  function strip0x(value) {
    return String(value || "").trim().replace(/^0x/i, "");
  }

  function toHex(bytes) {
    return `0x${commitment.bytesToHex(bytes)}`;
  }

  function concatHex(parts) {
    return `0x${parts.map((part) => strip0x(part)).join("")}`;
  }

  function word(value) {
    return `0x${commitment.bytesToHex(commitment.wordFromBigInt(BigInt(value)))}`;
  }

  function wordAt(hexValue, index) {
    const clean = strip0x(hexValue);
    const start = Number(index) * 64;
    const end = start + 64;

    if (clean.length < end) {
      throw new Error("ABI result is too short");
    }

    return clean.slice(start, end);
  }

  function wordToBigInt(hexWord) {
    return BigInt(`0x${strip0x(hexWord) || "0"}`);
  }

  function addressWord(address) {
    return `0x${commitment.bytesToHex(commitment.wordFromAddress(address))}`;
  }

  function bytes32Word(value) {
    return `0x${commitment.bytesToHex(commitment.wordFromBytes32(value))}`;
  }

  function bytesToWordPadded(hexValue) {
    const bytes = commitment.hexToBytes(strip0x(hexValue));
    const paddedLength = Math.ceil(bytes.length / 32) * 32;
    const output = new Uint8Array(paddedLength);
    output.set(bytes);
    return `0x${commitment.bytesToHex(output)}`;
  }

  function dynamicString(value) {
    const bytes = commitment.utf8Bytes(String(value));
    return concatHex([word(bytes.length), toHex(padRight(bytes))]);
  }

  function dynamicBytes(hexValue) {
    const bytes = commitment.hexToBytes(strip0x(hexValue));
    return concatHex([word(bytes.length), toHex(padRight(bytes))]);
  }

  function padRight(bytes) {
    const paddedLength = Math.ceil(bytes.length / 32) * 32;
    const output = new Uint8Array(paddedLength);
    output.set(bytes);
    return output;
  }

  function selector(signature) {
    return `0x${commitment.bytesToHex(commitment.keccak256(commitment.utf8Bytes(signature))).slice(0, 8)}`;
  }

  function encodeSubmitCommitment({ bountyId, commitmentHash }) {
    return concatHex([
      selector("submitCommitment(uint256,bytes32)"),
      word(bountyId),
      bytes32Word(commitmentHash)
    ]);
  }

  function encodeCreateBounty({ title, rubric, deadline }) {
    const titleTail = dynamicString(title);
    const rubricTail = dynamicString(rubric);
    const titleOffset = 96;
    const rubricOffset = 96 + strip0x(titleTail).length / 2;

    return concatHex([
      selector("createBounty(string,string,uint256)"),
      word(titleOffset),
      word(rubricOffset),
      word(deadline),
      titleTail,
      rubricTail
    ]);
  }

  function encodeRevealAnswer({ bountyId, answer, salt }) {
    return concatHex([
      selector("revealAnswer(uint256,string,bytes32)"),
      word(bountyId),
      word(96),
      bytes32Word(salt),
      dynamicString(answer)
    ]);
  }

  function encodeJudgeAll({ bountyId, llmInput }) {
    return concatHex([
      selector("judgeAll(uint256,bytes)"),
      word(bountyId),
      word(64),
      dynamicBytes(llmInput || "0x")
    ]);
  }

  function encodeFinalizeWinner({ bountyId, winnerIndex }) {
    return concatHex([
      selector("finalizeWinner(uint256,uint256)"),
      word(bountyId),
      word(winnerIndex)
    ]);
  }

  function encodeGetBounty({ bountyId }) {
    return concatHex([selector("getBounty(uint256)"), word(bountyId)]);
  }

  function decodeGetBountyStatus(resultHex) {
    const ownerWord = wordAt(resultHex, 0);

    return {
      owner: `0x${ownerWord.slice(24).toLowerCase()}`,
      reward: wordToBigInt(wordAt(resultHex, 3)),
      deadline: wordToBigInt(wordAt(resultHex, 4)),
      judged: wordToBigInt(wordAt(resultHex, 5)) !== 0n,
      finalized: wordToBigInt(wordAt(resultHex, 6)) !== 0n,
      submissionCount: wordToBigInt(wordAt(resultHex, 7)),
      winnerIndex: wordToBigInt(wordAt(resultHex, 8))
    };
  }

  function parseArtifactBytecode(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      throw new Error("Paste your compiled AIJudge artifact JSON or raw 0x bytecode first");
    }

    if (/^(or paste|paste artifacts|hardhat artifact)/i.test(trimmed)) {
      throw new Error("That is placeholder text. Paste the real AIJudge.json content or 0x bytecode");
    }

    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      if (trimmed.length <= 2) {
        throw new Error("Bytecode cannot be empty");
      }
      return trimmed;
    }

    let json;
    try {
      json = JSON.parse(trimmed);
    } catch {
      throw new Error("Artifact must be valid JSON from Hardhat, or raw bytecode starting with 0x");
    }
    const bytecode = json.bytecode?.object || json.bytecode;
    if (!bytecode || !/^0x[0-9a-fA-F]+$/.test(bytecode)) {
      throw new Error("Could not find 0x bytecode in artifact JSON");
    }
    return bytecode;
  }

  return {
    addressWord,
    bytes32Word,
    bytesToWordPadded,
    concatHex,
    decodeGetBountyStatus,
    dynamicBytes,
    dynamicString,
    encodeCreateBounty,
    encodeFinalizeWinner,
    encodeGetBounty,
    encodeJudgeAll,
    encodeRevealAnswer,
    encodeSubmitCommitment,
    parseArtifactBytecode,
    selector,
    word
  };
});
