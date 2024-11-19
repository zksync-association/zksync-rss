import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    // Get the deployer account
    // @ts-ignore
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Deploy MockGovernance
    const MockGovernance = await ethers.getContractFactory("MockGovernance");
    const mockGovernance = await MockGovernance.deploy();
    await mockGovernance.deployed();

    console.log("MockGovernance deployed to:", mockGovernance.address);

    // Save deployment information
    const deploymentInfo = {
        address: mockGovernance.address,
        // @ts-ignore
        network: (await ethers.provider.getNetwork()).name,
        // @ts-ignore
        deploymentBlock: await ethers.provider.getBlockNumber(),
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    // Save deployment info to file
    fs.writeFileSync(
        path.join(deploymentsDir, "MockGovernance.json"),
        JSON.stringify(deploymentInfo, null, 2)
    );

    return mockGovernance;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });