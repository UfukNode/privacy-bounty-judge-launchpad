# Architecture Note

## Required Track: Commit-Reveal

The required implementation works on any EVM chain. During the submission phase, the contract stores only a `bytes32` commitment. The plaintext answer is not stored on-chain until the reveal phase. After the deadline, each participant reveals the answer and salt. The contract validates the reveal by recomputing:

```solidity
keccak256(abi.encode(answer, salt, msg.sender, bountyId))
```

Only revealed and verified answers are eligible for `judgeAll`.

## Why `msg.sender` and `bountyId` Are Included

Including `msg.sender` prevents another wallet from revealing someone else's answer and salt. Including `bountyId` prevents a commitment from one bounty from being reused in another bounty.

## AI Judging Boundary

The AI receives a batch of valid revealed submissions and the bounty rubric. The AI returns an advisory review, such as a recommended winner and reasoning. The human bounty owner remains responsible for finalization. The contract should still enforce that the finalized winner index points to a valid revealed submission.

## Advanced Track: Ritual-Native Hidden Submissions

A stronger Ritual-native design would avoid publishing plaintext answers during reveal. In that design, encrypted answers could be stored off-chain or passed as encrypted/private inputs. The on-chain contract would store commitments, metadata, and eligibility state, while plaintext would only exist inside the TEE-backed executor during batch judging. The LLM would receive all eligible plaintext submissions in one batch, not one LLM call per answer. The architecture must clearly explain where plaintext exists, what is stored on-chain, what is stored off-chain, and how the batch prompt is assembled.
