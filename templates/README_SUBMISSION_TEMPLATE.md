# Privacy-Preserving AI Bounty Judge

## Overview

This submission updates the original AI bounty judge flow so participant answers are not posted publicly during the submission phase. Instead of sending plaintext answers directly on-chain, participants submit a commitment hash. After the submission deadline, they reveal their answer and salt. The contract verifies the reveal before making that answer eligible for AI judging.

## Lifecycle

1. The bounty owner creates a bounty with a title, rubric, reward, and deadline.
2. Participants prepare an answer and a private random `bytes32` salt.
3. Participants submit:

```solidity
keccak256(abi.encode(answer, salt, msg.sender, bountyId))
```

4. After the deadline, participants call `revealAnswer` with the original answer and salt.
5. The contract recomputes the commitment and checks that it matches the stored value.
6. Only valid revealed answers are included in the batch AI judging prompt.
7. The AI returns an advisory review.
8. The bounty owner finalizes the winner and the contract transfers the reward.

## Public vs Hidden Data

Public:

- Bounty title
- Bounty rubric
- Reward amount
- Deadline
- Commitment hashes
- Revealed answers after the reveal phase
- Final winner

Hidden until reveal:

- Plaintext answers
- Salt values

## AI vs Human Decision

The AI should evaluate revealed answers against the rubric and recommend a winner. The AI should not be the final authority because LLMs can make mistakes or be influenced by prompt injection inside submissions. The bounty owner should make the final decision after reading the AI review. The contract should enforce that the selected winner is a valid revealed submission.

## Reflection

What should be public, what should stay hidden, and what should be decided by AI versus by a human in a bounty system?

> Replace this paragraph with your own 5-8 sentence answer.
