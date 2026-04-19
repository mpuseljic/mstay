import hre from "hardhat";

async function main() {
  const { ethers } = hre;

  const tokenAddress = process.env.TOKEN_ADDRESS;
  const coreAddress = process.env.CORE_ADDRESS;

  if (!tokenAddress) throw new Error("TOKEN_ADDRESS nije postavljen");
  if (!coreAddress) throw new Error("CORE_ADDRESS nije postavljen");

  const token = await ethers.getContractAt("MStayCoin", tokenAddress);
  const core = await ethers.getContractAt("MStayCore", coreAddress);

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  console.log("Granting MINTER_ROLE to core...");
  const tx1 = await token.grantRole(MINTER_ROLE, coreAddress);
  await tx1.wait();

  console.log("Setting reward token in core...");
  const tx2 = await core.setRewardToken(tokenAddress);
  await tx2.wait();

  console.log("Setup complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
