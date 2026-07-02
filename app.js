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
  lastCommitment: ""
};

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
  llmInput: $("#llmInput"),
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
  state.contractAddress = normalizeAddress(address);
  localStorage.setItem("operator.contractAddress", state.contractAddress);
  els.contractAddressInput.value = state.contractAddress;
  els.proofContract.value = state.contractAddress;
  els.activeContractLabel.textContent = shortAddress(state.contractAddress);
  updateProofPack();
  updateButtons();
}

function setDeployHash(hash) {
  state.lastDeployHash = hash;
  localStorage.setItem("operator.deployHash", hash);
  els.deployHash.value = hash;
  updateProofPack();
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
    if (receipt) return receipt;
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
    const deadline = BigInt(els.bountyDeadline.value.trim());
    const value = toHexQuantity(parseEther(els.bountyReward.value));
    const data = EvmTools.encodeCreateBounty({
      title: els.bountyTitle.value,
      rubric: els.bountyRubric.value,
      deadline
    });
    const hash = await sendTransaction({ to: requireContract(), data, value });
    log(els.createLog, `createBounty tx: ${hash}`, "ok", txLink(hash));
    await waitForReceipt(hash);
    log(els.createLog, "Bounty creation confirmed. Use the emitted bountyId from explorer/logs.", "ok");
  } catch (err) {
    log(els.createLog, err.message, "error");
  } finally {
    setBusy(els.createBountyButton, false);
  }
}

function calculateCommitment() {
  requireWallet();
  const salt = CommitmentTools.normalizeBytes32(els.commitSalt.value);
  const bountyId = BigInt(els.commitBountyId.value.trim());
  const answer = els.commitAnswer.value;
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
    const commitment = state.lastCommitment || calculateCommitment();
    const data = EvmTools.encodeSubmitCommitment({
      bountyId: BigInt(els.commitBountyId.value.trim()),
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
    const data = EvmTools.encodeRevealAnswer({
      bountyId: BigInt(els.revealBountyId.value.trim()),
      answer: els.revealAnswer.value,
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

async function judgeAll() {
  setBusy(els.judgeButton, true, "Judging...");
  try {
    const data = EvmTools.encodeJudgeAll({
      bountyId: BigInt(els.judgeBountyId.value.trim()),
      llmInput: els.llmInput.value.trim() || "0x"
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
    const data = EvmTools.encodeFinalizeWinner({
      bountyId: BigInt(els.finalizeBountyId.value.trim()),
      winnerIndex: BigInt(els.winnerIndex.value.trim())
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
