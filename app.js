const form = document.querySelector("#commitment-form");
const answerInput = document.querySelector("#answer");
const saltInput = document.querySelector("#salt");
const addressInput = document.querySelector("#address");
const bountyIdInput = document.querySelector("#bounty-id");
const output = document.querySelector("#commitment-output");
const error = document.querySelector("#tool-error");
const generateSaltButton = document.querySelector("#generate-salt");

function setError(message) {
  error.textContent = message || "";
}

function setOutput(value) {
  output.textContent = value;
}

generateSaltButton.addEventListener("click", () => {
  try {
    saltInput.value = CommitmentTools.randomBytes32();
    setError("");
  } catch (err) {
    setError(err.message);
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  setError("");

  try {
    const answer = answerInput.value;
    const salt = CommitmentTools.normalizeBytes32(saltInput.value);
    const address = CommitmentTools.normalizeAddress(addressInput.value);
    const bountyId = BigInt(bountyIdInput.value.trim());

    const commitment = CommitmentTools.computeCommitment({
      answer,
      salt,
      address,
      bountyId
    });

    setOutput(commitment);
  } catch (err) {
    setOutput("Waiting for valid inputs");
    setError(err.message);
  }
});

for (const button of document.querySelectorAll("[data-copy-target]")) {
  button.addEventListener("click", async () => {
    const target = document.querySelector(`#${button.dataset.copyTarget}`);
    const value = target?.textContent?.trim();
    if (!value || !value.startsWith("0x")) return;

    await navigator.clipboard.writeText(value);
    const original = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1100);
  });
}
