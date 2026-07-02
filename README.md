# Ritual Bounty Operator

Unofficial single-screen wallet tool for the Ritual Academy privacy-preserving AI bounty judge assignment.

This is not an official Ritual resource and it is not a guaranteed assignment solution. It is a static dapp that helps participants do the repetitive browser-side work from one interface:

- connect wallet
- switch/add Ritual Chain
- load and compile the default commit-reveal `AIJudge.sol` with `solc`
- deploy a compiled contract from bytecode or a Hardhat artifact
- save the deployed contract address
- call `createBounty`
- generate salt and commitment
- call `submitCommitment`
- call `revealAnswer`
- call `judgeAll`
- call `finalizeWinner`
- prepare the Discord Proof of Building fields

The UI checks common revert cases before sending wallet transactions. If `Create Bounty` did not succeed, `Commit`, `Reveal`, `Judge`, and `Finalize` stop with a local error instead of burning gas on a known-bad transaction.

Ritual testnet block timestamps may appear in millisecond scale. The bundled `AIJudge.sol` normalizes that internally, so the UI still accepts normal Unix seconds. If you previously deployed an older contract and saw `deadline must be future`, compile and deploy the updated default contract again.

Official workshop repository:

```text
https://github.com/cozfuttu/ritual-chain-workshop
```

## Important Boundary

The tool can load the default assignment contract, compile it, and send transactions. Users can still edit the Solidity before compiling, but the default path does not require copy-pasting contract code.

For compile/deploy, either:

- click `Load Default Contract`, then `Compile Contract`, or
- paste raw `0x...` contract creation bytecode, or
- paste a Hardhat artifact JSON that contains a `bytecode` field

For `judgeAll`, paste the `llmInput` bytes from the workshop encoder or your own Ritual LLM encoder. The browser tool does not invent a valid Ritual LLM payload.

## Security Model

- No private key input
- No seed phrase input
- No backend
- No database
- No analytics
- No token approvals
- Only wallet-confirmed transactions
- Commitment calculation runs locally in the browser

The wallet confirmation screen is the final source of truth. Read every transaction before confirming.

## Run Locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:5173
```

## Run Tests

```bash
npm test
```

The tests cover:

- Keccak-256 known vectors
- Commitment ABI encoding
- Contract action calldata encoding
- Static server behavior

## GitHub Pages

This repo does not need a GitHub Actions workflow. To publish it:

1. Go to repository `Settings`.
2. Open `Pages`.
3. Select `Deploy from a branch`.
4. Select branch `main` and folder `/root`.
5. Save.

The page will be available at:

```text
https://ufuknode.github.io/privacy-bounty-judge-launchpad/
```

## Codespaces

Open:

```text
https://codespaces.new/UfukNode/privacy-bounty-judge-launchpad?quickstart=1
```

The devcontainer starts the static server and forwards port `5173`.
