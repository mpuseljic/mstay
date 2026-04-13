import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("MStayCore", function () {
  let core;
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
  });

  it("should create a listing", async function () {
    await core
      .connect(host)
      .createListing(
        "Apartman Arena",
        "Pula",
        ["ipfs://image1"],
        ethers.parseEther("0.1"),
      );

    const listings = await core.getAllListings();

    expect(listings.length).to.equal(1);
    expect(listings[0].title).to.equal("Apartman Arena");
    expect(listings[0].location).to.equal("Pula");
    expect(listings[0].host).to.equal(host.address);
    expect(listings[0].isActive).to.equal(true);
  });

  it("should allow reservation with correct ETH amount", async function () {
    await core
      .connect(host)
      .createListing(
        "Apartman Arena",
        "Pula",
        ["ipfs://image1"],
        ethers.parseEther("0.1"),
      );

    const now = await time.latest();
    const checkIn = now + 24 * 60 * 60;
    const checkOut = checkIn + 3 * 24 * 60 * 60;

    await core.connect(guest).makeReservation(1, checkIn, checkOut, {
      value: ethers.parseEther("0.3"),
    });

    const reservations = await core.getReservationsByGuest(guest.address);

    expect(reservations.length).to.equal(1);
    expect(reservations[0].listingId).to.equal(1n);
    expect(reservations[0].guest).to.equal(guest.address);
  });

  it("should reject reservation with incorrect ETH amount", async function () {
    await core
      .connect(host)
      .createListing(
        "Apartman Arena",
        "Pula",
        ["ipfs://image1"],
        ethers.parseEther("0.1"),
      );

    const now = await time.latest();
    const checkIn = now + 24 * 60 * 60;
    const checkOut = checkIn + 3 * 24 * 60 * 60;

    await expect(
      core.connect(guest).makeReservation(1, checkIn, checkOut, {
        value: ethers.parseEther("0.2"),
      }),
    ).to.be.reverted;
  });

  it("should reject overlapping reservation", async function () {
    await core
      .connect(host)
      .createListing(
        "Apartman Arena",
        "Pula",
        ["ipfs://image1"],
        ethers.parseEther("0.1"),
      );

    const now = await time.latest();
    const firstCheckIn = now + 24 * 60 * 60;
    const firstCheckOut = firstCheckIn + 3 * 24 * 60 * 60;

    await core.connect(guest).makeReservation(1, firstCheckIn, firstCheckOut, {
      value: ethers.parseEther("0.3"),
    });

    const overlappingCheckIn = firstCheckIn + 24 * 60 * 60;
    const overlappingCheckOut = overlappingCheckIn + 3 * 24 * 60 * 60;

    await expect(
      core
        .connect(otherGuest)
        .makeReservation(1, overlappingCheckIn, overlappingCheckOut, {
          value: ethers.parseEther("0.3"),
        }),
    ).to.be.reverted;
  });

  it("should allow reservation starting on checkout day", async function () {
    await core
      .connect(host)
      .createListing(
        "Apartman Arena",
        "Pula",
        ["ipfs://image1"],
        ethers.parseEther("0.1"),
      );

    const now = await time.latest();

    const firstCheckIn = now + 24 * 60 * 60;
    const firstCheckOut = firstCheckIn + 3 * 24 * 60 * 60;

    await core.connect(guest).makeReservation(1, firstCheckIn, firstCheckOut, {
      value: ethers.parseEther("0.3"),
    });

    const secondCheckIn = firstCheckOut;
    const secondCheckOut = secondCheckIn + 2 * 24 * 60 * 60;

    await core
      .connect(otherGuest)
      .makeReservation(1, secondCheckIn, secondCheckOut, {
        value: ethers.parseEther("0.2"),
      });

    const reservations = await core.getReservationsByListing(1);
    expect(reservations.length).to.equal(2);
  });

  it("should allow guest cancellation", async function () {
    await core
      .connect(host)
      .createListing(
        "Apartman Arena",
        "Pula",
        ["ipfs://image1"],
        ethers.parseEther("0.1"),
      );

    const now = await time.latest();
    const checkIn = now + 24 * 60 * 60;
    const checkOut = checkIn + 3 * 24 * 60 * 60;

    await core.connect(guest).makeReservation(1, checkIn, checkOut, {
      value: ethers.parseEther("0.3"),
    });

    await core.connect(guest).cancelReservationByGuest(1);

    const reservations = await core.getReservationsByGuest(guest.address);
    expect(Number(reservations[0].status)).to.not.equal(0);
  });

  it("should allow host to release payout", async function () {
    await core
      .connect(host)
      .createListing(
        "Apartman Arena",
        "Pula",
        ["ipfs://image1"],
        ethers.parseEther("0.1"),
      );

    const now = await time.latest();
    const checkIn = now + 24 * 60 * 60;
    const checkOut = checkIn + 3 * 24 * 60 * 60;

    await core.connect(guest).makeReservation(1, checkIn, checkOut, {
      value: ethers.parseEther("0.3"),
    });

    await time.increaseTo(checkIn + 1);

    await core.connect(host).releasePayout(1);

    const reservations = await core.getReservationsByGuest(guest.address);
    expect(Number(reservations[0].status)).to.equal(3);
  });
});
