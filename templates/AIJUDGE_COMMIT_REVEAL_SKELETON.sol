// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// This is a study skeleton, not a final contract.
// Copy the ideas into the official workshop contract and complete every TODO.

contract AIJudgeCommitRevealSkeleton {
    uint256 public constant MAX_SUBMISSIONS = 10;
    uint256 public constant MAX_ANSWER_LENGTH = 2_000;

    struct Submission {
        address submitter;
        bytes32 commitment;
        string answer;
        bool revealed;
    }

    struct Bounty {
        address owner;
        string title;
        string rubric;
        uint256 reward;
        uint256 deadline;
        bool judged;
        bool finalized;
        bytes aiReview;
        uint256 winnerIndex;
        Submission[] submissions;
    }

    mapping(uint256 => Bounty) public bounties;

    // Use 1-based indexes so 0 means "not submitted".
    mapping(uint256 => mapping(address => uint256)) public submissionIndexByUser;

    event CommitmentSubmitted(uint256 indexed bountyId, uint256 indexed submissionIndex, address indexed submitter);
    event AnswerRevealed(uint256 indexed bountyId, uint256 indexed submissionIndex, address indexed submitter);

    modifier bountyExists(uint256 bountyId) {
        require(bounties[bountyId].owner != address(0), "bounty not found");
        _;
    }

    modifier onlyOwner(uint256 bountyId) {
        require(msg.sender == bounties[bountyId].owner, "not bounty owner");
        _;
    }

    function submitCommitment(uint256 bountyId, bytes32 commitment) external bountyExists(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(block.timestamp < bounty.deadline, "commit phase closed");
        require(!bounty.judged, "already judged");
        require(!bounty.finalized, "already finalized");
        require(commitment != bytes32(0), "empty commitment");
        require(submissionIndexByUser[bountyId][msg.sender] == 0, "already committed");
        require(bounty.submissions.length < MAX_SUBMISSIONS, "too many submissions");

        bounty.submissions.push(
            Submission({
                submitter: msg.sender,
                commitment: commitment,
                answer: "",
                revealed: false
            })
        );

        uint256 submissionIndex = bounty.submissions.length - 1;
        submissionIndexByUser[bountyId][msg.sender] = submissionIndex + 1;

        emit CommitmentSubmitted(bountyId, submissionIndex, msg.sender);
    }

    function revealAnswer(uint256 bountyId, string calldata answer, bytes32 salt) external bountyExists(bountyId) {
        Bounty storage bounty = bounties[bountyId];
        uint256 storedIndex = submissionIndexByUser[bountyId][msg.sender];

        require(block.timestamp >= bounty.deadline, "reveal phase not open");
        require(storedIndex != 0, "no commitment");
        require(bytes(answer).length <= MAX_ANSWER_LENGTH, "answer too long");

        Submission storage submission = bounty.submissions[storedIndex - 1];
        require(!submission.revealed, "already revealed");

        bytes32 expected = keccak256(abi.encode(answer, salt, msg.sender, bountyId));
        require(expected == submission.commitment, "invalid reveal");

        submission.answer = answer;
        submission.revealed = true;

        emit AnswerRevealed(bountyId, storedIndex - 1, msg.sender);
    }

    function judgeAll(uint256 bountyId, bytes calldata llmInput) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(block.timestamp >= bounty.deadline, "deadline not passed");
        require(!bounty.judged, "already judged");
        require(!bounty.finalized, "already finalized");
        require(_revealedCount(bounty) > 0, "no revealed submissions");

        // TODO: forward llmInput to Ritual LLM precompile as in the workshop contract.
        // TODO: decode the precompile response and store the completion in bounty.aiReview.

        bounty.judged = true;
        bounty.aiReview = llmInput;
    }

    function finalizeWinner(uint256 bountyId, uint256 winnerIndex) external bountyExists(bountyId) onlyOwner(bountyId) {
        Bounty storage bounty = bounties[bountyId];

        require(bounty.judged, "not judged yet");
        require(!bounty.finalized, "already finalized");
        require(winnerIndex < bounty.submissions.length, "invalid winner");
        require(bounty.submissions[winnerIndex].revealed, "winner not revealed");

        bounty.finalized = true;
        bounty.winnerIndex = winnerIndex;

        // TODO: transfer reward to bounty.submissions[winnerIndex].submitter.
    }

    function _revealedCount(Bounty storage bounty) internal view returns (uint256 count) {
        for (uint256 i = 0; i < bounty.submissions.length; i += 1) {
            if (bounty.submissions[i].revealed) {
                count += 1;
            }
        }
    }
}
