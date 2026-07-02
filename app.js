const RITUAL_CHAIN = {
  chainId: "0x7bb",
  chainName: "Ritual Chain",
  nativeCurrency: { name: "Ritual", symbol: "RITUAL", decimals: 18 },
  rpcUrls: ["https://rpc.ritualfoundation.org"],
  blockExplorerUrls: ["https://explorer.ritualfoundation.org"]
};

const EXPLORER = "https://explorer.ritualfoundation.org";

const state = {
  provider: null,
  account: "",
  chainId: "",
  contractAddress: localStorage.getItem("operator.contractAddress") || "",
  lastDeployHash: localStorage.getItem("operator.deployHash") || "",
  currentBountyId: localStorage.getItem("operator.currentBountyId") || "",
  lastCommitment: ""
};

const BOUNTY_CREATED_TOPIC = CommitmentTools.keccak256Hex(
  CommitmentTools.utf8Bytes("BountyCreated(uint256,address,string,uint256,uint256)")
);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  connectButton: $("#connectButton"),
  switchNetworkButton: $("#switchNetworkButton"),
  networkStatus: $("#networkStatus"),
  walletAddress: $("#walletAddress"),
  walletBalance: $("#walletBalance"),
  activeContractLabel: $("#activeContractLabel"),
  contractAddressInput: $("#contractAddressInput"),
  saveContractButton: $("#saveContractButton"),
  aiJudgeSource: $("#aiJudgeSource"),
  precompileSource: $("#precompileSource"),
  loadDefaultContractButton: $("#loadDefaultContractButton"),
  loadPrecompileButton: $("#loadPrecompileButton"),
  compileButton: $("#compileButton"),
  compileLog: $("#compileLog"),
  artifactInput: $("#artifactInput"),
  deployContractButton: $("#deployContractButton"),
  setupLog: $("#setupLog"),
  bountyTitle: $("#bountyTitle"),
  bountyRubric: $("#bountyRubric"),
  bountyReward: $("#bountyReward"),
  bountyDeadline: $("#bountyDeadline"),
  deadlineThreeMinutesButton: $("#deadlineThreeMinutesButton"),
  deadlineOneHourButton: $("#deadlineOneHourButton"),
  createBountyButton: $("#createBountyButton"),
  createLog: $("#createLog"),
  commitBountyId: $("#commitBountyId"),
  commitAnswer: $("#commitAnswer"),
  commitSalt: $("#commitSalt"),
  generateSaltButton: $("#generateSaltButton"),
  calculateCommitmentButton: $("#calculateCommitmentButton"),
  commitmentOutput: $("#commitmentOutput"),
  submitCommitmentButton: $("#submitCommitmentButton"),
  commitLog: $("#commitLog"),
  revealBountyId: $("#revealBountyId"),
  revealAnswer: $("#revealAnswer"),
  revealSalt: $("#revealSalt"),
  revealButton: $("#revealButton"),
  revealLog: $("#revealLog"),
  judgeBountyId: $("#judgeBountyId"),
  llmExecutorAddress: $("#llmExecutorAddress"),
  llmInput: $("#llmInput"),
  generateLlmInputButton: $("#generateLlmInputButton"),
  judgeButton: $("#judgeButton"),
  judgeLog: $("#judgeLog"),
  finalizeBountyId: $("#finalizeBountyId"),
  winnerIndex: $("#winnerIndex"),
  finalizeButton: $("#finalizeButton"),
  finalizeLog: $("#finalizeLog"),
  forkUrl: $("#forkUrl"),
  proofContract: $("#proofContract"),
  deployHash: $("#deployHash"),
  struggleNote: $("#struggleNote"),
  proofPack: $("#proofPack"),
  copyProofButton: $("#copyProofButton")
};

function shortAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeAddress(value) {
  return CommitmentTools.normalizeAddress(value);
}

function requireWallet() {
  if (!state.provider || !state.account) {
    throw new Error("Connect wallet first");
  }
}

function requireRitual() {
  if (state.chainId?.toLowerCase() !== RITUAL_CHAIN.chainId) {
    throw new Error("Switch wallet to Ritual Chain first");
  }
}

function requireContract() {
  if (!state.contractAddress) {
    throw new Error("Set or deploy contract address first");
  }
  return normalizeAddress(state.contractAddress);
}

function toHexQuantity(value) {
  return `0x${BigInt(value).toString(16)}`;
}

function parseEther(value) {
  const raw = String(value || "").trim();
  if (!/^\d+(\.\d{0,18})?$/.test(raw)) {
    throw new Error("Reward must be a decimal RITUAL amount");
  }
  const [whole, fraction = ""] = raw.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}

function readRequiredText(input, label) {
  const value = String(input.value || "").trim();
  if (!value) {
    throw new Error(`${label} cannot be empty`);
  }
  return value;
}

function readPositiveInteger(input, label) {
  const raw = String(input.value || "").trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${label} must be a whole number`);
  }

  const value = BigInt(raw);
  if (value <= 0n) {
    throw new Error(`${label} must be 1 or bigger`);
  }

  return value;
}

function readNonNegativeInteger(input, label) {
  const raw = String(input.value || "").trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${label} must be a whole number`);
  }
  return BigInt(raw);
}

function readRewardWei() {
  const value = parseEther(els.bountyReward.value);
  if (value <= 0n) {
    throw new Error("Reward must be bigger than 0 RITUAL");
  }
  return value;
}

function readFutureDeadline() {
  const deadline = readPositiveInteger(els.bountyDeadline, "Deadline");
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (deadline <= now) {
    throw new Error("Deadline must be in the future. Click +1 hour for a safe test value.");
  }

  return deadline;
}

function readHexBytes(input, label, { allowEmpty = false } = {}) {
  const value = String(input.value || "").trim();
  if (!/^0x[0-9a-fA-F]*$/.test(value) || value.length % 2 !== 0) {
    throw new Error(`${label} must be 0x-prefixed hex bytes`);
  }
  if (!allowEmpty && value === "0x") {
    throw new Error(`${label} cannot be empty`);
  }
  return value;
}

function formatEther(hexWei) {
  const wei = BigInt(hexWei || "0x0");
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${fraction} RITUAL`;
}

function txLink(hash) {
  return `${EXPLORER}/tx/${hash}`;
}

function addressLink(address) {
  return `${EXPLORER}/address/${address}`;
}

function log(target, message, tone = "info", href = "") {
  const row = document.createElement(href ? "a" : "div");
  row.className = `activity-item ${tone}`;
  row.textContent = message;
  if (href) {
    row.href = href;
    row.target = "_blank";
    row.rel = "noreferrer";
  }
  target.prepend(row);
}

function setBusy(button, busy, busyText) {
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }
  button.disabled = busy;
  button.textContent = busy ? busyText : button.dataset.defaultText;
}

async function request(method, params = []) {
  return state.provider.request({ method, params });
}

function readableRpcError(err) {
  const messages = [];
  const seen = new Set();

  function collect(value) {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);

    for (const key of ["reason", "message"]) {
      if (typeof value[key] === "string" && value[key].trim()) {
        messages.push(value[key].trim());
      }
    }

    collect(value.data);
    collect(value.error);
    collect(value.cause);
  }

  collect(err);

  const joined = messages.join(" | ");
  const match = joined.match(/execution reverted(?::| with reason string)?\s*['"]?([^'"]+)?/i);
  if (match?.[1]) {
    return `execution reverted: ${match[1].trim()}`;
  }

  return joined || "transaction would revert";
}

async function simulateTransaction(tx) {
  if (!tx.to) return;

  try {
    await request("eth_call", [tx, "latest"]);
  } catch (err) {
    throw new Error(`Transaction blocked before gas is spent: ${readableRpcError(err)}`);
  }
}

async function callActiveContract(data) {
  requireWallet();
  requireRitual();

  try {
    return await request("eth_call", [
      {
        from: state.account,
        to: requireContract(),
        data
      },
      "latest"
    ]);
  } catch (err) {
    throw new Error(readableRpcError(err));
  }
}

async function readBountyStatus(bountyId) {
  const result = await callActiveContract(
    EvmTools.encodeGetBounty({ bountyId })
  );
  return EvmTools.decodeGetBountyStatus(result);
}

async function readBountyDetails(bountyId) {
  const result = await callActiveContract(
    EvmTools.encodeGetBounty({ bountyId })
  );
  return EvmTools.decodeGetBountyDetails(result);
}

async function requireExistingBounty(bountyId) {
  try {
    return await readBountyStatus(bountyId);
  } catch (err) {
    if (/bounty not found/i.test(err.message)) {
      throw new Error(`Bounty ID ${bountyId} does not exist. Create Bounty must succeed first.`);
    }
    throw err;
  }
}

function assertBountyOwner(status) {
  if (status.owner.toLowerCase() !== state.account.toLowerCase()) {
    throw new Error("Only the bounty creator can run this step");
  }
}

function assertOpenForCommit(status) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (status.finalized) throw new Error("This bounty is already finalized");
  if (status.judged) throw new Error("This bounty is already judged");
  if (now >= status.deadline) {
    throw new Error("Commit phase is closed. Create a new bounty or reveal an existing committed answer.");
  }
}

function assertOpenForReveal(status) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (status.finalized) throw new Error("This bounty is already finalized");
  if (status.judged) throw new Error("This bounty is already judged");
  if (now < status.deadline) {
    throw new Error(`Reveal is not open yet. Wait until unix deadline ${status.deadline}.`);
  }
}

function assertReadyForJudge(status) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  assertBountyOwner(status);
  if (status.finalized) throw new Error("This bounty is already finalized");
  if (status.judged) throw new Error("This bounty is already judged");
  if (now < status.deadline) {
    throw new Error(`Judge is not open yet. Wait until unix deadline ${status.deadline}.`);
  }
  if (status.submissionCount === 0n) {
    throw new Error("There are no submissions on this bounty");
  }
}

function assertReadyForFinalize(status) {
  assertBountyOwner(status);
  if (!status.judged) throw new Error("Run judgeAll successfully before finalizeWinner");
  if (status.finalized) throw new Error("This bounty is already finalized");
}

async function loadRevealedSubmissions(bountyId, submissionCount) {
  const submissions = [];

  for (let index = 0n; index < submissionCount; index += 1n) {
    const result = await callActiveContract(
      EvmTools.encodeGetSubmission({ bountyId, index })
    );
    const submission = EvmTools.decodeGetSubmission(result);

    if (submission.revealed) {
      submissions.push({
        index: Number(index),
        submitter: submission.submitter,
        answer: submission.answer
      });
    }
  }

  return submissions;
}

async function refreshWallet() {
  if (!state.provider || !state.account) return;
  state.chainId = await request("eth_chainId");
  const balance = await request("eth_getBalance", [state.account, "latest"]);

  els.walletAddress.textContent = shortAddress(state.account);
  els.walletBalance.textContent = formatEther(balance);
  els.networkStatus.textContent =
    state.chainId.toLowerCase() === RITUAL_CHAIN.chainId ? "Ritual connected" : `Wrong network ${state.chainId}`;
  els.networkStatus.classList.toggle("is-ok", state.chainId.toLowerCase() === RITUAL_CHAIN.chainId);
  els.switchNetworkButton.disabled = false;
  updateButtons();
}

function setContract(address) {
  if (!String(address || "").trim()) {
    throw new Error("Paste a real deployed contract address first");
  }
  const nextAddress = normalizeAddress(address);
  const changed = state.contractAddress && state.contractAddress.toLowerCase() !== nextAddress.toLowerCase();

  state.contractAddress = nextAddress;
  localStorage.setItem("operator.contractAddress", state.contractAddress);
  els.contractAddressInput.value = state.contractAddress;
  els.proofContract.value = state.contractAddress;
  els.activeContractLabel.textContent = shortAddress(state.contractAddress);
  if (changed) {
    clearCurrentBountyId();
  }
  updateProofPack();
  updateButtons();
}

function setDeployHash(hash) {
  state.lastDeployHash = hash;
  localStorage.setItem("operator.deployHash", hash);
  els.deployHash.value = hash;
  updateProofPack();
}

function setCurrentBountyId(bountyId) {
  const value = String(bountyId);
  state.currentBountyId = value;
  localStorage.setItem("operator.currentBountyId", value);

  els.commitBountyId.value = value;
  els.revealBountyId.value = value;
  els.judgeBountyId.value = value;
  els.finalizeBountyId.value = value;
}

function clearCurrentBountyId() {
  state.currentBountyId = "";
  localStorage.removeItem("operator.currentBountyId");

  els.commitBountyId.value = "";
  els.revealBountyId.value = "";
  els.judgeBountyId.value = "";
  els.finalizeBountyId.value = "";
}

function bountyIdFromReceipt(receipt) {
  const log = (receipt.logs || []).find(
    (item) => item.topics?.[0]?.toLowerCase() === BOUNTY_CREATED_TOPIC.toLowerCase()
  );

  if (!log?.topics?.[1]) return "";
  return BigInt(log.topics[1]).toString();
}

function updateButtons() {
  const walletReady = Boolean(state.account);
  const ritualReady = state.chainId?.toLowerCase() === RITUAL_CHAIN.chainId;
  const contractReady = Boolean(state.contractAddress);
  const txReady = walletReady && ritualReady && contractReady;

  els.deployContractButton.disabled = !(walletReady && ritualReady);
  els.createBountyButton.disabled = !txReady;
  els.submitCommitmentButton.disabled = !txReady;
  els.revealButton.disabled = !txReady;
  els.judgeButton.disabled = !txReady;
  els.finalizeButton.disabled = !txReady;
}

async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  }

  state.provider = window.ethereum;
  const accounts = await request("eth_requestAccounts");
  state.account = accounts[0];
  els.connectButton.textContent = shortAddress(state.account);

  state.provider.on?.("accountsChanged", (accountsChanged) => {
    state.account = accountsChanged[0] || "";
    els.connectButton.textContent = state.account ? shortAddress(state.account) : "Connect Wallet";
    refreshWallet();
  });
  state.provider.on?.("chainChanged", () => refreshWallet());

  await refreshWallet();
}

async function switchToRitual() {
  requireWallet();
  try {
    await request("wallet_switchEthereumChain", [{ chainId: RITUAL_CHAIN.chainId }]);
  } catch (err) {
    if (err.code !== 4902) throw err;
    await request("wallet_addEthereumChain", [RITUAL_CHAIN]);
  }
  await refreshWallet();
}

async function waitForReceipt(hash) {
  for (let i = 0; i < 90; i += 1) {
    const receipt = await request("eth_getTransactionReceipt", [hash]);
    if (receipt) {
      if (receipt.status && receipt.status !== "0x1") {
        throw new Error(`Transaction reverted on chain: ${hash}`);
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Transaction sent, but receipt did not arrive in time");
}

async function sendTransaction({ to, data, value = "0x0" }) {
  requireWallet();
  requireRitual();
  const tx = {
    from: state.account,
    data,
    value
  };
  if (to) tx.to = to;

  await simulateTransaction(tx);
  return request("eth_sendTransaction", [tx]);
}

async function deployContract() {
  setBusy(els.deployContractButton, true, "Deploying...");
  try {
    requireWallet();
    requireRitual();
    const bytecode = EvmTools.parseArtifactBytecode(els.artifactInput.value);
    const hash = await sendTransaction({ data: bytecode });
    setDeployHash(hash);
    log(els.setupLog, `Deploy tx sent: ${hash}`, "ok", txLink(hash));

    const receipt = await waitForReceipt(hash);
    if (!receipt.contractAddress) {
      throw new Error("Receipt has no contractAddress");
    }

    setContract(receipt.contractAddress);
    log(els.setupLog, `Contract deployed: ${receipt.contractAddress}`, "ok", addressLink(receipt.contractAddress));
  } catch (err) {
    log(els.setupLog, err.message, "error");
  } finally {
    setBusy(els.deployContractButton, false);
  }
}

async function loadDefaultPrecompile() {
  const response = await fetch("./templates/PrecompileConsumer.sol");
  if (!response.ok) {
    throw new Error("Could not load default PrecompileConsumer.sol");
  }
  els.precompileSource.value = await response.text();
}

async function loadDefaultAIJudge() {
  const response = await fetch("./templates/AIJudge.sol");
  if (!response.ok) {
    throw new Error("Could not load default AIJudge.sol");
  }
  els.aiJudgeSource.value = await response.text();
}

async function loadDefaultSources() {
  await Promise.all([loadDefaultAIJudge(), loadDefaultPrecompile()]);
}

async function compileContract() {
  setBusy(els.compileButton, true, "Compiling...");
  try {
    if (!/contract\s+AIJudge\b/.test(els.aiJudgeSource.value)) {
      throw new Error("AIJudge.sol source must contain `contract AIJudge`. Click `Load Default Contract`, then compile again.");
    }

    if (!els.precompileSource.value.trim()) {
      await loadDefaultPrecompile();
    }

    const response = await fetch("./api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiJudgeSource: els.aiJudgeSource.value,
        precompileConsumerSource: els.precompileSource.value,
        contractName: "AIJudge"
      })
    });
    const raw = await response.text();
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error("Compile API is not available here. Run the tool with npm start or Codespaces, then compile again.");
    }

    if (!result.ok) {
      throw new Error((result.errors || ["Compile failed"]).join("\n"));
    }

    els.artifactInput.value = JSON.stringify(result.artifact, null, 2);
    log(els.compileLog, `Compiled ${result.contractName}. Artifact moved to deploy box.`, "ok");

    for (const warning of result.warnings || []) {
      log(els.compileLog, warning, "info");
    }
  } catch (err) {
    log(els.compileLog, err.message, "error");
  } finally {
    setBusy(els.compileButton, false);
  }
}

async function createBounty() {
  setBusy(els.createBountyButton, true, "Creating...");
  try {
    const title = readRequiredText(els.bountyTitle, "Title");
    const rubric = readRequiredText(els.bountyRubric, "Rubric");
    const deadline = readFutureDeadline();
    const value = toHexQuantity(readRewardWei());
    const data = EvmTools.encodeCreateBounty({
      title,
      rubric,
      deadline
    });
    const hash = await sendTransaction({ to: requireContract(), data, value });
    log(els.createLog, `createBounty tx: ${hash}`, "ok", txLink(hash));
    const receipt = await waitForReceipt(hash);
    const bountyId = bountyIdFromReceipt(receipt);

    if (bountyId) {
      setCurrentBountyId(bountyId);
      log(els.createLog, `Bounty created. Bounty ID ${bountyId} filled into the next steps.`, "ok");
    } else {
      log(els.createLog, "Bounty creation confirmed. Read bountyId from the BountyCreated event in explorer.", "ok");
    }
  } catch (err) {
    log(els.createLog, err.message, "error");
    if (/deadline must be future/i.test(err.message)) {
      log(
        els.createLog,
        "If that deadline is future in Unix seconds, you are probably using the old deployed contract. Go to Setup, compile the updated default contract, deploy again, then retry Create Bounty.",
        "error"
      );
    }
  } finally {
    setBusy(els.createBountyButton, false);
  }
}

function calculateCommitment() {
  requireWallet();
  const salt = CommitmentTools.normalizeBytes32(els.commitSalt.value);
  const bountyId = readPositiveInteger(els.commitBountyId, "Bounty ID");
  const answer = readRequiredText(els.commitAnswer, "Answer");
  const commitment = CommitmentTools.computeCommitment({
    answer,
    salt,
    address: state.account,
    bountyId
  });

  state.lastCommitment = commitment;
  els.commitmentOutput.textContent = commitment;
  els.revealBountyId.value = els.commitBountyId.value;
  els.revealAnswer.value = answer;
  els.revealSalt.value = salt;
  return commitment;
}

async function submitCommitment() {
  setBusy(els.submitCommitmentButton, true, "Submitting...");
  try {
    const bountyId = readPositiveInteger(els.commitBountyId, "Bounty ID");
    const status = await requireExistingBounty(bountyId);
    assertOpenForCommit(status);

    const commitment = calculateCommitment();
    const data = EvmTools.encodeSubmitCommitment({
      bountyId,
      commitmentHash: commitment
    });
    const hash = await sendTransaction({ to: requireContract(), data });
    log(els.commitLog, `submitCommitment tx: ${hash}`, "ok", txLink(hash));
    await waitForReceipt(hash);
    log(els.commitLog, "Commit confirmed", "ok");
  } catch (err) {
    log(els.commitLog, err.message, "error");
  } finally {
    setBusy(els.submitCommitmentButton, false);
  }
}

async function revealAnswer() {
  setBusy(els.revealButton, true, "Revealing...");
  try {
    const bountyId = readPositiveInteger(els.revealBountyId, "Bounty ID");
    const status = await requireExistingBounty(bountyId);
    assertOpenForReveal(status);

    const data = EvmTools.encodeRevealAnswer({
      bountyId,
      answer: readRequiredText(els.revealAnswer, "Answer"),
      salt: CommitmentTools.normalizeBytes32(els.revealSalt.value)
    });
    const hash = await sendTransaction({ to: requireContract(), data });
    log(els.revealLog, `revealAnswer tx: ${hash}`, "ok", txLink(hash));
    await waitForReceipt(hash);
    log(els.revealLog, "Reveal confirmed", "ok");
  } catch (err) {
    log(els.revealLog, err.message, "error");
  } finally {
    setBusy(els.revealButton, false);
  }
}

async function generateLlmInput({ quiet = false } = {}) {
  setBusy(els.generateLlmInputButton, true, "Generating...");
  try {
    const bountyId = readPositiveInteger(els.judgeBountyId, "Bounty ID");
    const bounty = await readBountyDetails(bountyId);
    assertReadyForJudge(bounty);

    const submissions = await loadRevealedSubmissions(bountyId, bounty.submissionCount);
    if (submissions.length === 0) {
      throw new Error("No revealed submissions yet. Reveal at least one answer before judging.");
    }

    const llmInput = EvmTools.buildJudgeAllLlmInput({
      executorAddress: normalizeAddress(els.llmExecutorAddress.value),
      title: bounty.title,
      rubric: bounty.rubric,
      submissions
    });

    els.llmInput.value = llmInput;
    if (!quiet) {
      log(els.judgeLog, `LLM input generated from ${submissions.length} revealed submission(s).`, "ok");
    }
    return llmInput;
  } catch (err) {
    if (!quiet) {
      log(els.judgeLog, err.message, "error");
    }
    throw err;
  } finally {
    setBusy(els.generateLlmInputButton, false);
  }
}

async function judgeAll() {
  setBusy(els.judgeButton, true, "Judging...");
  try {
    const bountyId = readPositiveInteger(els.judgeBountyId, "Bounty ID");
    const status = await requireExistingBounty(bountyId);
    assertReadyForJudge(status);
    const llmInput = els.llmInput.value.trim() || await generateLlmInput({ quiet: true });

    const data = EvmTools.encodeJudgeAll({
      bountyId,
      llmInput: readHexBytes({ value: llmInput }, "LLM input bytes")
    });
    const hash = await sendTransaction({ to: requireContract(), data });
    log(els.judgeLog, `judgeAll tx: ${hash}`, "ok", txLink(hash));
    await waitForReceipt(hash);
    log(els.judgeLog, "Judge transaction confirmed", "ok");
  } catch (err) {
    log(els.judgeLog, err.message, "error");
  } finally {
    setBusy(els.judgeButton, false);
  }
}

async function finalizeWinner() {
  setBusy(els.finalizeButton, true, "Finalizing...");
  try {
    const bountyId = readPositiveInteger(els.finalizeBountyId, "Bounty ID");
    const status = await requireExistingBounty(bountyId);
    assertReadyForFinalize(status);

    const winnerIndex = readNonNegativeInteger(els.winnerIndex, "Winner index");
    if (winnerIndex >= status.submissionCount) {
      throw new Error(`Winner index is too high. This bounty has ${status.submissionCount} submissions.`);
    }

    const data = EvmTools.encodeFinalizeWinner({
      bountyId,
      winnerIndex
    });
    const hash = await sendTransaction({ to: requireContract(), data });
    log(els.finalizeLog, `finalizeWinner tx: ${hash}`, "ok", txLink(hash));
    await waitForReceipt(hash);
    log(els.finalizeLog, "Winner finalized", "ok");
  } catch (err) {
    log(els.finalizeLog, err.message, "error");
  } finally {
    setBusy(els.finalizeButton, false);
  }
}

function updateProofPack() {
  const pack = [
    "GitHub Fork URL:",
    els.forkUrl.value || "https://github.com/yourname/ritual-chain-workshop",
    "",
    "Deployed Contract Address:",
    els.proofContract.value || state.contractAddress || "0x...",
    "",
    "Deploy Transaction Hash:",
    els.deployHash.value || state.lastDeployHash || "0x...",
    "",
    "A step you struggled with:",
    els.struggleNote.value
  ].join("\n");
  els.proofPack.textContent = pack;
}

function initTabs() {
  for (const tab of $$("[data-tool-tab]")) {
    tab.addEventListener("click", () => {
      $$("[data-tool-tab]").forEach((item) => item.classList.remove("is-active"));
      $$("[data-tool-panel]").forEach((item) => item.classList.remove("is-active"));
      tab.classList.add("is-active");
      $(`[data-tool-panel="${tab.dataset.toolTab}"]`).classList.add("is-active");
    });
  }
}

function initCopyButtons() {
  for (const button of $$("[data-copy-target]")) {
    button.addEventListener("click", async () => {
      const target = $(`#${button.dataset.copyTarget}`);
      const value = target?.textContent?.trim();
      if (!value) return;
      await navigator.clipboard.writeText(value);
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = original;
      }, 1000);
    });
  }
}

function init() {
  initTabs();
  initCopyButtons();

  els.contractAddressInput.value = state.contractAddress;
  els.proofContract.value = state.contractAddress;
  els.deployHash.value = state.lastDeployHash;
  els.activeContractLabel.textContent = state.contractAddress ? shortAddress(state.contractAddress) : "Not set";
  if (state.currentBountyId) {
    setCurrentBountyId(state.currentBountyId);
  }
  updateProofPack();

  els.connectButton.addEventListener("click", () => connectWallet().catch((err) => alert(err.message)));
  els.switchNetworkButton.addEventListener("click", () => switchToRitual().catch((err) => alert(err.message)));
  els.saveContractButton.addEventListener("click", () => {
    try {
      setContract(els.contractAddressInput.value);
      log(els.setupLog, "Contract address saved", "ok", addressLink(state.contractAddress));
    } catch (err) {
      log(els.setupLog, `Contract address problem: ${err.message}`, "error");
    }
  });
  els.deployContractButton.addEventListener("click", deployContract);
  els.loadDefaultContractButton.addEventListener("click", () => {
    loadDefaultSources()
      .then(() => log(els.compileLog, "Default AIJudge.sol and import loaded", "ok"))
      .catch((err) => log(els.compileLog, err.message, "error"));
  });
  els.loadPrecompileButton.addEventListener("click", () => {
    loadDefaultPrecompile()
      .then(() => log(els.compileLog, "Default PrecompileConsumer.sol loaded", "ok"))
      .catch((err) => log(els.compileLog, err.message, "error"));
  });
  els.compileButton.addEventListener("click", compileContract);
  els.deadlineThreeMinutesButton.addEventListener("click", () => {
    els.bountyDeadline.value = Math.floor(Date.now() / 1000 + 180).toString();
  });
  els.deadlineOneHourButton.addEventListener("click", () => {
    els.bountyDeadline.value = Math.floor(Date.now() / 1000 + 3600).toString();
  });
  els.createBountyButton.addEventListener("click", createBounty);
  els.generateSaltButton.addEventListener("click", () => {
    els.commitSalt.value = CommitmentTools.randomBytes32();
  });
  els.calculateCommitmentButton.addEventListener("click", () => {
    try {
      const value = calculateCommitment();
      log(els.commitLog, `Commitment calculated: ${value}`, "ok");
    } catch (err) {
      log(els.commitLog, err.message, "error");
    }
  });
  els.submitCommitmentButton.addEventListener("click", submitCommitment);
  els.revealButton.addEventListener("click", revealAnswer);
  els.generateLlmInputButton.addEventListener("click", () => generateLlmInput().catch(() => {}));
  els.judgeButton.addEventListener("click", judgeAll);
  els.finalizeButton.addEventListener("click", finalizeWinner);
  els.copyProofButton.addEventListener("click", async () => {
    updateProofPack();
    await navigator.clipboard.writeText(els.proofPack.textContent);
    els.copyProofButton.textContent = "Copied";
    setTimeout(() => {
      els.copyProofButton.textContent = "Copy Proof Pack";
    }, 1000);
  });
  [els.forkUrl, els.proofContract, els.deployHash, els.struggleNote].forEach((input) => {
    input.addEventListener("input", updateProofPack);
  });

  loadDefaultSources()
    .then(() => log(els.compileLog, "Default contract loaded. Click Compile Contract.", "ok"))
    .catch((err) => log(els.compileLog, err.message, "error"));

  if (window.ethereum?.selectedAddress) {
    connectWallet().catch(() => {});
  }
}

init();
