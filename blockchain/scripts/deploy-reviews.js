async function main() {
  const coreAddress = process.env.CORE_ADDRESS;

  if (!coreAddress) {
    throw new Error("CORE_ADDRESS nije postavljen u .env");
  }

  const Reviews = await ethers.getContractFactory("MStayReviews");
  const reviews = await Reviews.deploy(coreAddress);

  await reviews.waitForDeployment();

  const address = await reviews.getAddress();
  console.log("mStayReviews deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
