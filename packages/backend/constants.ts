export const EventsMapping = {
  "ZKsync Network": {
    "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E": [
        "QuorumUpdated",
        "ProposalQueued",
        "ProposalExecuted",
        "ProposalCanceled",
        "ProposalCreated",
    ],
    "0x76705327e682F2d96943280D99464Ab61219e34f": [
        "ProposalQueued",
        "ProposalThresholdSet",
        "ProposalExtended",
        "LateQuorumVoteExtensionSet",
        "CallScheduled",
        "CallExecuted",
        "MinDelayChange",
        "ProposalExecuted",
        "ProposalCanceled",
        "ProposalCreated",
    ],
    "0x3701fB675bCd4A85eb11A2467628BBe193F6e6A8": [
        "RoleAdminChanged",
        "RoleGranted",
        "RoleRevoked",
        "CallScheduled",
        "CallExecuted",
        "MinDelayChange",
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
        "CallScheduled",
        "CallExecuted",
        "MinDelayChange",
        "ProposalExecuted",
        "ProposalCanceled",
        "ProposalCreated",
    ],
    "0x3E21c654B545Bf6236DC08236169DcF13dA4dDd6": [
        "RoleAdminChanged",
        "RoleGranted",
        "RoleRevoked",
        "CallScheduled",
        "CallExecuted",
        "MinDelayChange",
    ],
    "0x496869a7575A1f907D1C5B1eca28e4e9E382afAb": [
        "ProposalExecuted",
        "ProposalCanceled",
        "ProposalCreated",
        "CallScheduled",
        "CallExecuted",
        "ProposalExtended",
        "LateQuorumVoteExtensionSet",
        "ProposalThresholdSet",
        "VotingPeriodSet",
        "VotingDelaySet",
        "ProposalQueued",
        "QuorumUpdated",
    ],
    "0xC3e970cB015B5FC36edDf293D2370ef5D00F7a19": [
        "RoleAdminChanged",
        "RoleGranted",
        "RoleRevoked",
        "CallScheduled",
        "CallExecuted",
        "MinDelayChange",
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
        "ReinforceFreeze",
        "Unfreeze",
        "ReinforceFreezeOneChain",
        "ReinforceUnfreeze",
        "ReinforceUnfreezeOneChain",
    ],
  },
};

export const getGovBodyFromAddress = (address: string): string => {
    const addressMapping: { [key: string]: string } = {
      "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E": "Token",                       // ZK Token
      "0x76705327e682F2d96943280D99464Ab61219e34f": "ZkProtocolGovernor",          // ZkProtocolGovernor Governor
      "0x3701fB675bCd4A85eb11A2467628BBe193F6e6A8": "ZkProtocolGovernor Timelock", // ZkProtocolGovernor Timelock
      "0x10560f8B7eE37571AD7E3702EEb12Bc422036E89": "ZkTokenGovernor",             // ZkTokenGovernor Governor
      "0x3E21c654B545Bf6236DC08236169DcF13dA4dDd6": "ZkTokenGovernor Timelock",    // ZkTokenGovernor Timelock
      "0x496869a7575A1f907D1C5B1eca28e4e9E382afAb": "ZkGovOpsGovernor",            // ZkGovOpsGovernor Governor
      "0xC3e970cB015B5FC36edDf293D2370ef5D00F7a19": "ZkGovOpsGovernor Timelock",   // ZkGovOpsGovernor Timelock
      "0x8f7a9912416e8AdC4D9c21FAe1415D3318A11897": "Protocol Upgrade Handler",    // Protocol Upgrade Handler
      "0xdEFd1eDEE3E8c5965216bd59C866f7f5307C9b29": "Emergency Upgrade Board",     // Emergency Upgrade Board
      "0xD677e09324F8Bb3cC64F009973693f751c33A888": "Guardians",                   // Guardians
      "0xBDFfCC71FE84020238F2990a6D2954e87355De0D": "Security Council",            // Security Council
      "0xbC1653bd3829dfEc575AfC3816D4899cd103B51c": "Foundation",                  // Foundation
      "0x5d89444f84d544deBbD13D672f314A4DfaE3f77C": "zkMessage",                   // Changelog zkMessage
    };
  
    return addressMapping[address] || "Unknown Governance Body";
  }

  export const convertBigIntToString = (obj: any): any => {
    if (typeof obj === 'bigint') {
      return obj.toString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(convertBigIntToString);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {};
      for (const key in obj) {
        newObj[key] = convertBigIntToString(obj[key]);
      }
      return newObj;
    }
    
    return obj;
  }

  export const getCategory = (address: string): string => {
    // Protocol Governor contracts
    const protocolContracts = [
      "0x76705327e682F2d96943280D99464Ab61219e34f", // ZkProtocolGovernor
      "0x3701fB675bCd4A85eb11A2467628BBe193F6e6A8"  // ZkProtocolGovernor Timelock
    ];
  
    // Token Governor contracts
    const tokenContracts = [
      "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E", // Token
      "0x10560f8B7eE37571AD7E3702EEb12Bc422036E89", // ZkTokenGovernor
      "0x3E21c654B545Bf6236DC08236169DcF13dA4dDd6"  // ZkTokenGovernor Timelock
    ];
  
    // GovOps Governor contracts
    const govOpsContracts = [
      "0x496869a7575A1f907D1C5B1eca28e4e9E382afAb", // ZkGovOpsGovernor
      "0xC3e970cB015B5FC36edDf293D2370ef5D00F7a19"  // ZkGovOpsGovernor Timelock
    ];
  
    // First check the contract address to determine the governor
    if (protocolContracts.includes(address)) return "Protocol";
    if (tokenContracts.includes(address)) return "Token";
    if (govOpsContracts.includes(address)) return "GovOps";
  
    // Special cases for other contracts
    if (address === "0x8f7a9912416e8AdC4D9c21FAe1415D3318A11897") return "Protocol"; // Protocol Upgrade Handler
    if (address === "0x5d89444f84d544deBbD13D672f314A4DfaE3f77C") return "Message";  // zkMessage
  
    // For emergency/security related contracts
    if ([
      "0xdEFd1eDEE3E8c5965216bd59C866f7f5307C9b29", // Emergency Upgrade Board
      "0xD677e09324F8Bb3cC64F009973693f751c33A888", // Guardians
      "0xBDFfCC71FE84020238F2990a6D2954e87355De0D", // Security Council
      "0xbC1653bd3829dfEc575AfC3816D4899cd103B51c"  // Foundation
    ].includes(address)) {
      return "Emergency";
    }
  
    return "Other";
  }

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
    "event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay)",
    "event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data)",
    "event CallSalt(bytes32 id)",
    "event Cancelled(bytes32 indexed id)",

    // Governance parameter events
    "event MinDelayChange(uint256 oldDuration, uint256 newDuration)",
    "event ProposalExtended(uint256 proposalId, uint64 extendedDeadline)",
    "event LateQuorumVoteExtensionSet(uint64 oldVoteExtension, uint64 newVoteExtension)",
    "event ProposalQueued(bytes32 proposalId)",

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

    // Governance parameter update events
    "event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum)",
    "event ProposalThresholdSet(uint256 oldProposalThreshold, uint256 newProposalThreshold)",
    "event VotingPeriodSet(uint256 oldVotingPeriod, uint256 newVotingPeriod)",
    "event VotingDelaySet(uint256 oldVotingDelay, uint256 newVotingDelay)"
];

