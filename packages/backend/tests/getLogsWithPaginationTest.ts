import "tsconfig-paths/register";
import assert from "node:assert";
import { ethers } from "ethers";
import { __private__ } from "../shared/getEventsFromBatch";

type Log = ethers.Log;
type Filter = ethers.Filter;
type RpcResponse = { logs?: Log[]; pageKey?: string } | Log[];

class MockProvider {
  public sendCalls: { method: string; params: unknown[] }[] = [];
  public getLogsCalls: Filter[] = [];
  private responses: RpcResponse[];
  private readonly fallbackLogs: Log[];
  private throwOnSend: boolean;

  constructor(options: { responses?: RpcResponse[]; fallbackLogs?: Log[]; throwOnSend?: boolean } = {}) {
    this.responses = options.responses ?? [];
    this.fallbackLogs = options.fallbackLogs ?? [];
    this.throwOnSend = options.throwOnSend ?? false;
  }

  async send(method: string, params: unknown[]): Promise<RpcResponse> {
    this.sendCalls.push({ method, params });

    if (this.throwOnSend) {
      this.throwOnSend = false;
      throw new Error("Method not found");
    }

    if (this.responses.length === 0) {
      return [];
    }

    return this.responses.shift() as RpcResponse;
  }

  async getLogs(filter: Filter): Promise<Log[]> {
    this.getLogsCalls.push(filter);
    return this.fallbackLogs;
  }
}

const createLog = (overrides: Partial<Log>): Log => ({
  blockNumber: 1,
  blockHash: "0xblock",
  transactionIndex: 0,
  removed: false,
  address: "0x0",
  data: "0x",
  index: 0,
  topics: [],
  transactionHash: "0x",
  ...overrides
} as unknown as Log);

async function testPagination(): Promise<void> {
  const logA = createLog({ transactionHash: "0x1", blockNumber: 23048076 });
  const logB = createLog({ transactionHash: "0x2", blockNumber: 23048077 });

  const provider = new MockProvider({
    responses: [
      { logs: [logA], pageKey: "next" },
      { logs: [logB] }
    ]
  });

  const logs = await __private__.getLogsWithPagination(
    provider as unknown as ethers.Provider,
    {
      address: ["0x0000000000000000000000000000000000000001"],
      topics: [],
      fromBlock: 23048076,
      toBlock: 23048080
    }
  );

  assert.equal(logs.length, 2, "logs should include both pages");
  assert.equal(provider.sendCalls.length, 2, "should call alchemy_getLogs twice");
  const firstCall = provider.sendCalls[0];
  assert.equal(firstCall.method, "alchemy_getLogs");
  const params0 = firstCall.params[0] as { fromBlock: string; toBlock: string };
  assert.equal(params0.fromBlock, ethers.toBeHex(23048076));
  assert.equal(params0.toBlock, ethers.toBeHex(23048080));
}

async function testFallback(): Promise<void> {
  const fallbackLog = createLog({ transactionHash: "0xfallback" });
  const provider = new MockProvider({
    fallbackLogs: [fallbackLog],
    throwOnSend: true
  });

  const logs = await __private__.getLogsWithPagination(
    provider as unknown as ethers.Provider,
    {
      address: "0x0000000000000000000000000000000000000001",
      topics: [],
      fromBlock: 10,
      toBlock: 20
    }
  );

  assert.equal(provider.sendCalls.length, 1, "alchemy_getLogs should be attempted once");
  assert.equal(provider.getLogsCalls.length, 1, "fallback getLogs should be used");
  assert.equal(logs.length, 1, "fallback log should be returned");
  assert.equal(logs[0].transactionHash, "0xfallback");
}

async function run() {
  await testPagination();
  await testFallback();
  console.log("✅ getLogsWithPagination tests passed");
}

run().catch((error) => {
  console.error("❌ getLogsWithPagination tests failed", error);
  process.exit(1);
});
