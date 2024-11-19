// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            chainId: 31337
        },
        localhost: {
            chainId: 31337,
            url: "http://127.0.0.1:8545"
        }
    },
    paths: {
        sources: "./mocks",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};

export default config;