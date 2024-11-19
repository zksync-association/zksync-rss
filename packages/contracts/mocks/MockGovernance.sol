// contracts/mocks/MockGovernance.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockGovernance {
    event ProposalSubmitted(uint256 indexed proposalId, address proposer);
    event ProposalExecuted(uint256 indexed proposalId);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);

    function submitProposal(uint256 proposalId) external {
        emit ProposalSubmitted(proposalId, msg.sender);
    }

    function executeProposal(uint256 proposalId) external {
        emit ProposalExecuted(proposalId);
    }

    function castVote(uint256 proposalId, bool support) external {
        emit VoteCast(proposalId, msg.sender, support);
    }
}