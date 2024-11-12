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

export const ContractAddresses = {
    "Ethereum Mainnet": [
        "0x8f7a9912416e8AdC4D9c21FAe1415D3318A11897",
        "0xdEFd1eDEE3E8c5965216bd59C866f7f5307C9b29",
        "0xD677e09324F8Bb3cC64F009973693f751c33A888",
        "0xBDFfCC71FE84020238F2990a6D2954e87355De0D",
        "0xbC1653bd3829dfEc575AfC3816D4899cd103B51c"
    ],
    "ZKsync Network": [
        "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E",
        "0x76705327e682F2d96943280D99464Ab61219e34f",
        "0x3701fB675bCd4A85eb11A2467628BBe193F6e6A8",
        "0x10560f8B7eE37571AD7E3702EEb12Bc422036E89",
        "0x3E21c654B545Bf6236DC08236169DcF13dA4Ddd6",
        "0x496869a7575A1f907D1C5B1eca28e4e9E382afAb",
        "0xC3e970cB015B5FC36edDf293D2370ef5D00F7a19",
        "0x5d89444f84d544deBbD13D672f314A4DfaE3f77C"
    ]
};

export const getGovBodyFromAddress = (address: string): string => {
    const addressMapping: { [key: string]: string } = {
      "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E": "Token",                        // ZK Token
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

export const  UnifiedMinimalABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "_securityCouncilBefore",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "_securityCouncilAfter",
                "type": "address"
            }
        ],
        "name": "ChangeSecurityCouncil",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "_guardiansBefore",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "_guardiansAfter",
                "type": "address"
            }
        ],
        "name": "ChangeGuardians",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "_emergencyUpgradeBoardBefore",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "_emergencyUpgradeBoardAfter",
                "type": "address"
            }
        ],
        "name": "ChangeEmergencyUpgradeBoard",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "_id",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "proposer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "UpgradeStarted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "_id",
                "type": "bytes32"
            }
        ],
        "name": "UpgradeLegalVetoExtended",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "_id",
                "type": "bytes32"
            }
        ],
        "name": "UpgradeApprovedBySecurityCouncil",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "_id",
                "type": "bytes32"
            }
        ],
        "name": "UpgradeApprovedByGuardians",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "_id",
                "type": "bytes32"
            }
        ],
        "name": "UpgradeExecuted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "_id",
                "type": "bytes32"
            }
        ],
        "name": "EmergencyUpgradeExecuted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_protocolFrozenUntil",
                "type": "uint256"
            }
        ],
        "name": "SoftFreeze",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_protocolFrozenUntil",
                "type": "uint256"
            }
        ],
        "name": "HardFreeze",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [],
        "name": "ReinforceFreeze",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [],
        "name": "Unfreeze",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_chainId",
                "type": "uint256"
            }
        ],
        "name": "ReinforceFreezeOneChain",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [],
        "name": "ReinforceUnfreeze",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "_chainId",
                "type": "uint256"
            }
        ],
        "name": "ReinforceUnfreezeOneChain",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "id",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "target",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "predecessor",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "delay",
                "type": "uint256"
            }
        ],
        "name": "CallScheduled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "id",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "target",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "CallExecuted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "id",
                "type": "bytes32"
            }
        ],
        "name": "CallSalt",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "id",
                "type": "bytes32"
            }
        ],
        "name": "Cancelled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "oldDuration",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newDuration",
                "type": "uint256"
            }
        ],
        "name": "MinDelayChange",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "proposalId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "extendedDeadline",
                "type": "uint64"
            }
        ],
        "name": "ProposalExtended",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "oldVoteExtension",
                "type": "uint64"
            },
            {
                "indexed": false,
                "internalType": "uint64",
                "name": "newVoteExtension",
                "type": "uint64"
            }
        ],
        "name": "LateQuorumVoteExtensionSet",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "proposalId",
                "type": "bytes32"
            }
        ],
        "name": "ProposalQueued",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "previousAdminRole",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "newAdminRole",
                "type": "bytes32"
            }
        ],
        "name": "RoleAdminChanged",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            }
        ],
        "name": "RoleGranted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "role",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            }
        ],
        "name": "RoleRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "id",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "target",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "predecessor",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "delay",
                "type": "uint256"
            }
        ],
        "name": "CallScheduled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "id",
                "type": "bytes32"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "target",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "CallExecuted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "bool",
                "name": "oldState",
                "type": "bool"
            },
            {
                "indexed": false,
                "internalType": "bool",
                "name": "newState",
                "type": "bool"
            }
        ],
        "name": "IsProposeGuardedToggled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "proxy",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "singleton",
                "type": "address"
            }
        ],
        "name": "ProxyCreation",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "tag",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "message",
                "type": "string"
            }
        ],
        "name": "MessageSent",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "tag",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "message",
                "type": "string"
            }
        ],
        "name": "MessengerApproved",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "tag",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "message",
                "type": "string"
            }
        ],
        "name": "MessengerRevoked",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "proposalId",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "proposer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address[]",
                "name": "targets",
                "type": "address[]"
            },
            {
                "indexed": false,
                "internalType": "uint256[]",
                "name": "values",
                "type": "uint256[]"
            },
            {
                "indexed": false,
                "internalType": "string[]",
                "name": "signatures",
                "type": "string[]"
            },
            {
                "indexed": false,
                "internalType": "bytes[]",
                "name": "calldatas",
                "type": "bytes[]"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "voteStart",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "voteEnd",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "description",
                "type": "string"
            }
        ],
        "name": "ProposalCreated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "bytes32",
                "name": "_id",
                "type": "bytes32"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "proposer",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "UpgradeStarted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "oldQuorum",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newQuorum",
                "type": "uint256"
            }
        ],
        "name": "QuorumUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "proposalId",
                "type": "uint256"
            }
        ],
        "name": "ProposalExecuted",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "proposalId",
                "type": "uint256"
            }
        ],
        "name": "ProposalCanceled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "oldProposalThreshold",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newProposalThreshold",
                "type": "uint256"
            }
        ],
        "name": "ProposalThresholdSet",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "oldVotingPeriod",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newVotingPeriod",
                "type": "uint256"
            }
        ],
        "name": "VotingPeriodSet",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "oldVotingDelay",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newVotingDelay",
                "type": "uint256"
            }
        ],
        "name": "VotingDelaySet",
        "type": "event"
    }    
]
