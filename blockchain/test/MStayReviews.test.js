import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("MStayReviews", function () {
  let core;
  let reviews;
  let owner;
  let host;
  let guest;
  let otherGuest;
  let ethers;

  beforeEach(async function () {
    ethers = hre.ethers;
    [owner, host, guest, otherGuest] = await ethers.getSigners();

    const MStayCore = await ethers.getContractFactory("MStayCore");
    core = await MStayCore.deploy();
    await core.waitForDeployment();

    const MStayReviews = await ethers.getContractFactory("MStayReviews");
    reviews = await MStayReviews.deploy(await core.getAddress());
    await reviews.waitForDeployment();

    await core
      .connect(host)
      .createListing(
        "Apartman Arena",
        "Pula",
        ["ipfs://image1"],
        ethers.parseEther("0.1"),
      );
  });

  async function createReservation() {
    const now = await time.latest();
    const checkIn = now + 24 * 60 * 60;
    const checkOut = checkIn + 3 * 24 * 60 * 60;

    await core.connect(guest).makeReservation(1, checkIn, checkOut, {
      value: ethers.parseEther("0.3"),
    });

    return { checkIn, checkOut };
  }

  it("should allow guest to review host after checkout", async function () {
    const { checkOut } = await createReservation();

    await time.increaseTo(checkOut + 1);

    await reviews.connect(guest).leaveReview(1, 5, "Odlican domacin", true);

    const userReviews = await reviews.getReviewsForUser(host.address);
    expect(userReviews.length).to.equal(1);
    expect(Number(userReviews[0].rating)).to.equal(5);
    expect(userReviews[0].reviewedUser).to.equal(host.address);
  });

  it("should allow host to review guest after checkout", async function () {
    const { checkOut } = await createReservation();

    await time.increaseTo(checkOut + 1);

    await reviews.connect(host).leaveReview(1, 4, "Odlican gost", false);

    const userReviews = await reviews.getReviewsForUser(guest.address);
    expect(userReviews.length).to.equal(1);
    expect(Number(userReviews[0].rating)).to.equal(4);
    expect(userReviews[0].reviewedUser).to.equal(guest.address);
  });

  it("should block review before checkout", async function () {
    await createReservation();

    await expect(
      reviews.connect(guest).leaveReview(1, 5, "Prerano", true),
    ).to.be.revertedWith("Review available after check-out");
  });

  it("should block double guest review", async function () {
    const { checkOut } = await createReservation();

    await time.increaseTo(checkOut + 1);

    await reviews.connect(guest).leaveReview(1, 5, "Prva recenzija", true);

    await expect(
      reviews.connect(guest).leaveReview(1, 4, "Druga recenzija", true),
    ).to.be.reverted;
  });

  it("should block double host review", async function () {
    const { checkOut } = await createReservation();

    await time.increaseTo(checkOut + 1);

    await reviews.connect(host).leaveReview(1, 5, "Prva recenzija", false);

    await expect(
      reviews.connect(host).leaveReview(1, 4, "Druga recenzija", false),
    ).to.be.reverted;
  });

  it("should return correct review summary", async function () {
    const { checkOut } = await createReservation();

    await time.increaseTo(checkOut + 1);

    await reviews.connect(guest).leaveReview(1, 5, "Odlican domacin", true);

    const [avgScaled, count] = await reviews.getReviewSummaryForUser(
      host.address,
    );

    expect(Number(avgScaled)).to.equal(50);
    expect(Number(count)).to.equal(1);
  });

  it("should store review hash", async function () {
    const { checkOut } = await createReservation();

    await time.increaseTo(checkOut + 1);

    await reviews.connect(guest).leaveReview(1, 5, "Hash test", true);

    const userReviews = await reviews.getReviewsForUser(host.address);
    expect(userReviews[0].reviewHash).to.not.equal(
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    );
  });
});
