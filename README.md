# Privacy-Preserving Bounty Judge Launchpad

Unofficial one-click launchpad and local helper for the Ritual Academy privacy-preserving AI bounty judge assignment.

This repository helps learners understand the commit-reveal pattern, generate local commitment hashes, prepare test plans, and organize Proof of Building deliverables. It is not affiliated with, endorsed by, or maintained by the Ritual team. It is designed to be opened directly from GitHub Pages or GitHub Codespaces.

Brand note: any Ritual names, logos, or marks belong to their respective owners and are used only to identify the workshop topic.

## What This Is

- A one-click browser launchpad for the assignment flow
- A local `keccak256(abi.encode(answer, salt, msg.sender, bountyId))` helper
- A checklist for the required commit-reveal assignment flow
- Templates for README, test plan, and architecture notes
- A static site that works in GitHub Codespaces and on GitHub Pages

## What This Is Not

- Not an official Ritual resource
- Not a replacement for the official workshop repository
- Not a one-click assignment solver
- Not an auto-deploy tool
- Not a tool that collects private keys, seed phrases, or wallet signatures

Official workshop repository:

```text
https://github.com/cozfuttu/ritual-chain-workshop
```

## Security Model

This helper is intentionally small and dependency-free.

- No private key input
- No wallet connection
- No backend
- No database
- No analytics
- No token approvals
- No signature requests
- Commitment calculation runs locally in the browser

Users should still verify their final Solidity implementation and deployment transactions independently.

## One-Click Use

Open the live helper in your browser:

```text
https://ufuknode.github.io/privacy-bounty-judge-launchpad/
```

Open in GitHub Codespaces:

```text
https://codespaces.new/UfukNode/privacy-bounty-judge-launchpad?quickstart=1
```

Codespaces will install nothing, run `npm test`, start the static server, and forward port `5173`.

## Run Locally

```bash
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
- Minimal Solidity ABI encoding for the commitment formula
- Static server routing and MIME behavior

## Run in GitHub Codespaces

Use the one-click Codespaces URL:

```text
https://codespaces.new/UfukNode/privacy-bounty-judge-launchpad?quickstart=1
```

Or open the repository in Codespaces manually and run:

```bash
npm start
```

Then open the forwarded `5173` port from the Codespaces Ports panel.

## Assignment Reminder

The required track is commit-reveal:

1. Participants submit only a commitment before the deadline.
2. Participants reveal the answer and salt after the deadline.
3. The contract verifies:

```solidity
keccak256(abi.encode(answer, salt, msg.sender, bountyId))
```

4. Only valid revealed submissions are eligible for AI judging.
5. The AI review is advisory; the bounty owner finalizes the winner.

## Suggested Sharing Note

If sharing this with a cohort or Telegram group, use language like:

```text
Ritual Academy ödevi için unofficial bir yardımcı launchpad hazırladım. Commit-reveal mantığını anlatıyor, commitment hesaplıyor, test checklist veriyor ve Proof of Building için ne lazım gösteriyor. Resmi kaynak değil, ödevin hazır cevabı değil.
```

Longer Telegram copy is available at:

```text
templates/TELEGRAM_MESSAGE.md
```
