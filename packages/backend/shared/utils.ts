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
