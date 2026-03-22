const { ethers } = require("hardhat");

async function main() {
  const MStay = await ethers.getContractFactory("mStay");
  const mStay = await MStay.deploy();

  await mStay.waitForDeployment();

  const address = await mStay.getAddress();
  console.log("mStay deployed to: ", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
