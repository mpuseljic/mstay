import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  const MStayCore = await ethers.getContractFactory("MStayCore");
  const core = await MStayCore.deploy();
  await core.waitForDeployment();

  console.log("MStayCore deployed to:", await core.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
