import { ethers } from "ethers";
import { NetworkConfig } from "./types";
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const GCS_RSS_PATH = process.env.GCS_RSS_PATH || '';
export const GCS_ARCHIVE_PATH = process.env.GCS_ARCHIVE_PATH || ''
export const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';
export const GCS_STATE_FILE_PATH = process.env.GCS_STATE_FILE_PATH || '';

export const ARCHIVE_ITEM_THRESHOLD = Number(process.env.ARCHIVE_ITEM_THRESHOLD  || 50);
export const ARCHIVE_ITEM_LIMIT = Number(process.env.ARCHIVE_ITEM_LIMIT || 100);

export const EventsMapping = {
  "ZKsync Network": {
    "0x76705327e682F2d96943280D99464Ab61219e34f": [
        "ProposalQueued",
        "ProposalThresholdSet",
        "ProposalExtended",
        "LateQuorumVoteExtensionSet",
        "ProposalExecuted",
        "ProposalCanceled",
        "ProposalCreated",
        "TimelockChange",
        "CallScheduled",
        "QuorumUpdated",
        "VotingDelaySet",
        "VotingPeriodSet",
    ],
    "0x3701fB675bCd4A85eb11A2467628BBe193F6e6A8": [
        "RoleAdminChanged",
        "RoleGranted",
        "RoleRevoked",
        "MinDelayChange",
        "CallScheduled",
        "CallExecuted",
        "Cancelled",
    ],
    "0x10560f8B7eE37571AD7E3702EEb12Bc422036E89": [
        "QuorumUpdated",
        "IsProposeGuardedToggled",
        "ProposalQueued",
        "ProposalThresholdSet",
        "VotingPeriodSet",
        "VotingDelaySet",
        "ProposalExtended",
        "LateQuorumVoteExtensionSet",
        "ProposalExecuted",
        "ProposalCanceled",
        "ProposalCreated",
        "TimelockChange",
    ],
    "0x3E21c654B545Bf6236DC08236169DcF13dA4dDd6": [
        "RoleAdminChanged",
        "RoleGranted",
        "RoleRevoked",
        "MinDelayChange",
        "CallScheduled",
        "CallExecuted",
        "Cancelled",
    ],
    "0x496869a7575A1f907D1C5B1eca28e4e9E382afAb": [
        "ProposalExecuted",
        "ProposalCanceled",
        "ProposalCreated",
        "ProposalExtended",
        "LateQuorumVoteExtensionSet",
        "ProposalThresholdSet",
        "VotingPeriodSet",
        "VotingDelaySet",
        "ProposalQueued",
        "QuorumUpdated",
        "TimelockChange",
    ],
    "0xC3e970cB015B5FC36edDf293D2370ef5D00F7a19": [
        "RoleAdminChanged",
        "RoleGranted",
        "RoleRevoked",
        "MinDelayChange",
        "CallScheduled",
        "CallExecuted",
    ],
    "0x5d89444f84d544deBbD13D672f314A4DfaE3f77C": [
        "MessageSent",
        "MessengerApproved",
        "MessengerRevoked",
    ],
},
"Ethereum Mainnet": {
    "0x8f7a9912416e8AdC4D9c21FAe1415D3318A11897": [
        "ChangeSecurityCouncil",
        "ChangeGuardians",
        "ChangeEmergencyUpgradeBoard",
        "UpgradeStarted",
        "UpgradeLegalVetoExtended",
        "UpgradeApprovedBySecurityCouncil",
        "UpgradeApprovedByGuardians",
        "UpgradeExecuted",
        "EmergencyUpgradeExecuted",
        "SoftFreeze",
        "HardFreeze",
        "Unfreeze",
        "ReinforceFreezeOneChain",
        "ReinforceUnfreeze",
        "ReinforceUnfreezeOneChain",
    ],
  },
};

export const UnifiedMinimalABI = [
  // Events related to governance roles and changes
  "event ChangeSecurityCouncil(address indexed _securityCouncilBefore, address indexed _securityCouncilAfter)",
  "event ChangeGuardians(address indexed _guardiansBefore, address indexed _guardiansAfter)",
  "event ChangeEmergencyUpgradeBoard(address indexed _emergencyUpgradeBoardBefore, address indexed _emergencyUpgradeBoardAfter)",

  // Upgrade related events
  "event UpgradeStarted(bytes32 indexed _id, address proposer, uint256 value, bytes data)",
  "event UpgradeLegalVetoExtended(bytes32 indexed _id)",
  "event UpgradeApprovedBySecurityCouncil(bytes32 indexed _id)",
  "event UpgradeApprovedByGuardians(bytes32 indexed _id)",
  "event UpgradeExecuted(bytes32 indexed _id)",
  "event EmergencyUpgradeExecuted(bytes32 indexed _id)",

  // Freeze related events
  "event SoftFreeze(uint256 _protocolFrozenUntil)",
  "event HardFreeze(uint256 _protocolFrozenUntil)",
  "event ReinforceFreeze()",
  "event Unfreeze()",
  "event ReinforceFreezeOneChain(uint256 _chainId)",
  "event ReinforceUnfreeze()",
  "event ReinforceUnfreezeOneChain(uint256 _chainId)",

  // Call scheduling and execution events
  "event Cancelled(bytes32 indexed id)",
  "event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)",
  "event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)",

  // Governance parameter events
  "event MinDelayChange(uint256 oldDuration, uint256 newDuration)",
  "event ProposalExtended(uint256 proposalId, uint64 extendedDeadline)",
  "event LateQuorumVoteExtensionSet(uint64 oldVoteExtension, uint64 newVoteExtension)",
  "event ProposalQueued(bytes32 proposalId)",
  "event TimelockChange(address oldTimelock, address newTimelock)",
  
  // Role management events
  "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",

  // Proxy and messaging events
  "event ProxyCreation(address proxy, address singleton)",
  "event MessageSent(address user, string tag, string message)",
  "event MessengerApproved(address user, string tag, string message)",
  "event MessengerRevoked(address user, string tag, string message)",

  // Proposal and voting events
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  "event ProposalExecuted(uint256 proposalId)",
  "event ProposalCanceled(uint256 proposalId)",
  "event IsProposeGuardedToggled(bool oldState, bool newState)",
  "event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)",
  "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)",

  // Governance parameter update events
  "event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum)",
  "event ProposalThresholdSet(uint256 oldProposalThreshold, uint256 newProposalThreshold)",
  "event VotingPeriodSet(uint256 oldVotingPeriod, uint256 newVotingPeriod)",
  "event VotingDelaySet(uint256 oldVotingDelay, uint256 newVotingDelay)"
];

const zkSyncProvider = ethers.getDefaultProvider(process.env.ZKSYNC_RPC_URL || 'https://mainnet.era.zksync.io');
const ethereumProvider = ethers.getDefaultProvider(process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com');



export const ethereumConfig: NetworkConfig = {
    provider: ethereumProvider,
    eventsMapping: EventsMapping["Ethereum Mainnet"],
    networkName: "Ethereum Mainnet",
    chainId: 1,
    blockExplorerUrl: "https://etherscan.io",
    governanceName: "Ethereum Governance",
    pollInterval: 15000
  };
  
export const zkSyncConfig: NetworkConfig = {
    provider: zkSyncProvider,
    eventsMapping: EventsMapping["ZKsync Network"],
    networkName: "ZKSync",
    chainId: 324,
    blockExplorerUrl: "https://explorer.zksync.io",
    governanceName: "ZKSync Governance",
    pollInterval: 1000
  };
  
