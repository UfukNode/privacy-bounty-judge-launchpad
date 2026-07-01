# Commit-Reveal Test Plan

Use this as a checklist while writing Hardhat tests.

## Bounty Creation

- Creates a bounty with reward, title, rubric, and deadline.
- Rejects bounty creation with zero reward.

## Commit Phase

- Allows a participant to submit a commitment before the deadline.
- Rejects commitments after the deadline.
- Rejects duplicate commitments from the same participant for the same bounty.
- Rejects commitments after the bounty has been judged or finalized.
- Enforces the maximum submission count.

## Reveal Phase

- Rejects reveal before the deadline.
- Rejects reveal for a participant with no commitment.
- Rejects reveal with the wrong salt.
- Rejects reveal with a changed answer.
- Rejects reveal from a different wallet than the committer.
- Rejects answers longer than the maximum answer length.
- Accepts reveal when answer, salt, sender, and bounty ID match the stored commitment.
- Rejects duplicate reveal.

## Judging

- Rejects judging when there are no valid revealed answers.
- Rejects non-owner judging.
- Stores the AI review after a successful `judgeAll`.
- Does not include unrevealed commitments in the eligible submission set.

## Finalization

- Rejects finalize before judging.
- Rejects non-owner finalization.
- Rejects winner indexes outside the submission range.
- Rejects unrevealed winner indexes.
- Transfers the bounty reward to the selected revealed winner.
- Prevents double finalization.
