// test/unit/EventMonitor.test.ts
import chai from "chai";
const { expect } = chai;
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockGovernance } from '../../typechain-types/MockGovernance'
import { monitorEventsAtBlock } from '../../../backend/monitor/getEventsAtBlock';

describe("Event Monitor", () => {
  let mockGovernance: MockGovernance;
  let owner: SignerWithAddress;
  let voter: SignerWithAddress;
  let provider: any;

  beforeEach(async () => {
    // @ts-ignore
    [owner, voter] = await ethers.getSigners();
    provider = ethers.provider;

    // Deploy mock contract
    const MockGovernance = await ethers.getContractFactory("MockGovernance");
    mockGovernance = (await MockGovernance.deploy()) as unknown as MockGovernance;
    await mockGovernance.deployed();
    await mockGovernance.deployed();
  });

  it("should detect ProposalSubmitted event", async () => {
    // Prepare contract config for monitor
    const contractsConfig = {
      [mockGovernance.address]: ["ProposalSubmitted"]
    };

    // Submit proposal
    const tx = await mockGovernance.submitProposal(1);
    const receipt = await tx.wait();
    
    // Monitor events at this block
    const events = await monitorEventsAtBlock(
      receipt.blockNumber,
      provider,
      contractsConfig
    );

    // Assertions
    expect(events).to.have.length(1);
    expect(events[0].eventName).to.equal("ProposalSubmitted");
    expect(events[0].args.proposalId).to.equal(1);
  });

  it("should correctly categorize events", async () => {
    const contractsConfig = {
      [mockGovernance.address]: ["ProposalSubmitted", "ProposalExecuted"]
    };

    // Generate multiple events
    const tx1 = await mockGovernance.submitProposal(1);
    await tx1.wait();
    const tx2 = await mockGovernance.executeProposal(1);
    const receipt2 = await tx2.wait();

    const events = await monitorEventsAtBlock(
      receipt2.blockNumber,
      provider,
      contractsConfig
    );

    expect(events[0].topics).to.include("Protocol");
  });

  it("should handle multiple events in same block", async () => {
    // Test implementation
  });

  it("should handle non-existent contracts gracefully", async () => {
    // Test implementation
  });
});