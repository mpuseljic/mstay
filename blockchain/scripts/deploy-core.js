async function main() {
  const Core = await ethers.getContractFactory("MStayCore");
  const core = await Core.deploy();

  await core.waitForDeployment();

  const address = await core.getAddress();
  console.log("mStayCore deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
