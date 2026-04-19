import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying MStayCoin with:", deployer.address);

  const Token = await ethers.getContractFactory("MStayCoin");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  console.log("MStayCoin deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
