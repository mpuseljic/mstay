import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { startBlockchainListener } from "./listeners/blockchainListener.js";
import { readEvents } from "./utils/eventsStore.js";
import {
  normalizeAddress,
  calculateAverageRating,
  formatEthFromWei,
} from "./utils/analytics.js";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");

const profilesPath = path.join(__dirname, "data", "profiles.json");
const listingDetailsPath = path.join(dataDir, "listingDetails.json");

function ensureListingDetailsFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(listingDetailsPath)) {
    fs.writeFileSync(listingDetailsPath, "[]", "utf8");
  }
}

function reservationsOverlap(startA, endA, startB, endB) {
  return Number(startA) < Number(endB) && Number(endA) > Number(startB);
}

function toUnixTimestamp(dateString) {
  return Math.floor(new Date(dateString).getTime() / 1000);
}

function readListingDetails() {
  try {
    ensureListingDetailsFile();
    const raw = fs.readFileSync(listingDetailsPath, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.error("Greška kod čitanja listingDetails.json: ", err);
    return [];
  }
}

function writeListingDetails(data) {
  ensureListingDetailsFile();
  fs.writeFileSync(listingDetailsPath, JSON.stringify(data, null, 2), "utf8");
}

function readProfiles() {
  try {
    if (!fs.existsSync(profilesPath)) {
      fs.writeFileSync(profilesPath, "[]", "utf8");
    }

    const raw = fs.readFileSync(profilesPath, "utf8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.error("Greška kod čitanja profiles.json:", err);
    return [];
  }
}

function writeProfiles(profiles) {
  fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), "utf8");
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/upload-image", upload.single("file"), async (req, res) => {
  try {
    if (!process.env.PINATA_JWT) {
      return res.status(500).json({ message: "PINATA_JWT nije postavljen." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Datoteka nije poslana." });
    }

    const formData = new FormData();

    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("file", blob, req.file.originalname);
    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: req.file.originalname,
      }),
    );
    formData.append(
      "pinataOptions",
      JSON.stringify({
        cidVersion: 1,
      }),
    );

    const uploadRes = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
        body: formData,
      },
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      return res.status(500).json({
        message: "Greška pri uploadu na Pinata.",
        details: errorText,
      });
    }

    const result = await uploadRes.json();
    const ipfsHash = result.IpfsHash;
    const gatewayHost =
      process.env.PINATA_GATEWAY_URL || "gateway.pinata.cloud";
    const ipfsUrl = `https://${gatewayHost}/ipfs/${ipfsHash}`;

    return res.json({
      success: true,
      ipfsHash,
      ipfsUrl,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Neočekivana greška pri uploadu slike.",
      details: error.message,
    });
  }
});

app.get("/api/profile/:walletAddress", (req, res) => {
  try {
    const walletAddress = String(req.params.walletAddress || "").toLowerCase();
    const profiles = readProfiles();

    const profile = profiles.find(
      (p) => String(p.walletAddress || "").toLowerCase() === walletAddress,
    );

    if (!profile) {
      return res.json({
        success: true,
        profile: null,
      });
    }

    return res.json({
      success: true,
      profile,
    });
  } catch (err) {
    console.error("Greška kod dohvaćanja profila:", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod dohvaćanja profila.",
    });
  }
});

app.post("/api/profile/update", express.json(), (req, res) => {
  try {
    const {
      walletAddress,
      firstName,
      lastName,
      displayName,
      bio,
      location,
      jobTitle,
      languages,
      about,
      avatarUrl,
    } = req.body || {};

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "walletAddress je obavezan.",
      });
    }

    const normalizedWallet = String(walletAddress).toLowerCase();
    const profiles = readProfiles();

    const existingIndex = profiles.findIndex(
      (p) => String(p.walletAddress || "").toLowerCase() === normalizedWallet,
    );

    const existingProfile = existingIndex >= 0 ? profiles[existingIndex] : null;

    const profileData = {
      walletAddress: normalizedWallet,
      firstName: String(firstName || "").trim(),
      lastName: String(lastName || "").trim(),
      displayName: String(displayName || "").trim(),
      bio: String(bio || "").trim(),
      location: String(location || "").trim(),
      jobTitle: String(jobTitle || "").trim(),
      languages: Array.isArray(languages) ? languages : [],
      about: String(about || "").trim(),
      avatarUrl: String(avatarUrl || "").trim(),
      isVerified: existingProfile?.isVerified || false,
      verificationProvider: existingProfile?.verificationProvider || "",
      verificationLevel: existingProfile?.verificationLevel || "",
      verifiedAt: existingProfile?.verifiedAt || null,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      profiles[existingIndex] = {
        ...profiles[existingIndex],
        ...profileData,
      };
    } else {
      profiles.push({
        ...profileData,
        createdAt: new Date().toISOString(),
      });
    }

    writeProfiles(profiles);

    return res.json({
      success: true,
      message: "Profil je uspješno spremljen.",
      profile:
        existingIndex >= 0
          ? profiles[existingIndex]
          : profiles[profiles.length - 1],
    });
  } catch (err) {
    console.error("Greška kod spremanja profila:", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod spremanja profila.",
    });
  }
});

app.post("/api/profile/verify", (req, res) => {
  try {
    const { walletAddress, provider, proofId } = req.body || {};

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "walletAddress je obavezan.",
      });
    }

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "provider je obavezan.",
      });
    }

    // Za sada mock verifikacija:
    // kasnije ovdje ide stvarna provjera prema World ID / Privado / drugom provideru
    if (!proofId || !String(proofId).trim()) {
      return res.status(400).json({
        success: false,
        message: "proofId je obavezan za verifikaciju.",
      });
    }

    const normalizedWallet = String(walletAddress).toLowerCase();
    const profiles = readProfiles();

    const existingIndex = profiles.findIndex(
      (p) => String(p.walletAddress || "").toLowerCase() === normalizedWallet,
    );

    const verificationData = {
      isVerified: true,
      verificationProvider: String(provider).trim(),
      verificationLevel: "proof_of_human",
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      profiles[existingIndex] = {
        ...profiles[existingIndex],
        ...verificationData,
      };
    } else {
      profiles.push({
        walletAddress: normalizedWallet,
        firstName: "",
        lastName: "",
        displayName: "",
        bio: "",
        location: "",
        jobTitle: "",
        languages: [],
        about: "",
        avatarUrl: "",
        ...verificationData,
        createdAt: new Date().toISOString(),
      });
    }

    writeProfiles(profiles);

    const saved =
      existingIndex >= 0
        ? profiles[existingIndex]
        : profiles[profiles.length - 1];

    return res.json({
      success: true,
      message: "Profil je uspješno verificiran.",
      profile: saved,
    });
  } catch (err) {
    console.error("Greška kod verifikacije profila:", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod verifikacije profila.",
      error: err.message,
    });
  }
});

app.post("/api/profile/unverify", (req, res) => {
  try {
    const { walletAddress } = req.body || {};

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "walletAddress je obavezan.",
      });
    }

    const normalizedWallet = String(walletAddress).toLowerCase();
    const profiles = readProfiles();

    const existingIndex = profiles.findIndex(
      (p) => String(p.walletAddress || "").toLowerCase() === normalizedWallet,
    );

    if (existingIndex < 0) {
      return res.status(404).json({
        success: false,
        message: "Profil nije pronađen.",
      });
    }

    profiles[existingIndex] = {
      ...profiles[existingIndex],
      isVerified: false,
      verificationProvider: "",
      verificationLevel: "",
      verifiedAt: null,
      updatedAt: new Date().toISOString(),
    };

    writeProfiles(profiles);

    return res.json({
      success: true,
      message: "Verifikacija je uklonjena.",
      profile: profiles[existingIndex],
    });
  } catch (err) {
    console.error("Greška kod uklanjanja verifikacije:", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod uklanjanja verifikacije.",
      error: err.message,
    });
  }
});

app.get("/api/listing-details/:listingId", (req, res) => {
  try {
    const listingId = Number(req.params.listingId);
    const allDetails = readListingDetails();

    const details =
      allDetails.find((x) => Number(x.listingId) === listingId) || null;

    return res.json({
      success: true,
      details,
    });
  } catch (err) {
    console.error("Greška kod dohvaćanja listing details: ", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod dohvaćanja listing details",
    });
  }
});

app.post("/api/listing-details/update", (req, res) => {
  try {
    const payload = req.body || {};
    const listingId = Number(payload.listingId);

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "listingId je obavezan.",
      });
    }

    const allDetails = readListingDetails();
    const existingIndex = allDetails.findIndex(
      (x) => Number(x.listingId) === listingId,
    );

    const cleanData = {
      listingId,
      summary: String(payload.summary || "").trim(),
      descriptionShort: String(payload.descriptionShort || "").trim(),
      descriptionLong: String(payload.descriptionLong || "").trim(),
      propertyType: String(payload.propertyType || "").trim(),
      guestCount: Number(payload.guestCount || 0),
      bedrooms: Number(payload.bedrooms || 0),
      beds: Number(payload.beds || 0),
      bathrooms: Number(payload.bathrooms || 0),
      highlights: Array.isArray(payload.highlights) ? payload.highlights : [],
      amenities: Array.isArray(payload.amenities) ? payload.amenities : [],
      sleepingArrangements: Array.isArray(payload.sleepingArrangements)
        ? payload.sleepingArrangements
        : [],
      locationTitle: String(payload.locationTitle || "").trim(),
      locationDescription: String(payload.locationDescription || "").trim(),
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      houseRules: Array.isArray(payload.houseRules) ? payload.houseRules : [],
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      allDetails[existingIndex] = {
        ...allDetails[existingIndex],
        ...cleanData,
      };
    } else {
      allDetails.push({
        ...cleanData,
        createdAt: new Date().toISOString(),
      });
    }

    writeListingDetails(allDetails);

    const saved =
      existingIndex >= 0
        ? allDetails[existingIndex]
        : allDetails[allDetails.length - 1];

    return res.json({
      success: true,
      message: "Listing details su uspješno spremljeni.",
      details: saved,
    });
  } catch (err) {
    console.error("Greška kod spremanja listing details:", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod spremanja listing details.",
      error: err.message,
    });
  }
});

app.post("/api/geocode", async (req, res) => {
  try {
    const { query } = req.body || {};

    if (!query || !String(query).trim()) {
      return res.status(400).json({
        success: false,
        message: "query je obavezan.",
      });
    }

    const searchParams = new URLSearchParams({
      q: String(query).trim(),
      format: "jsonv2",
      limit: "1",
      addressdetails: "1",
    });

    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
      {
        headers: {
          "User-Agent": "mStay/1.0 (student project)",
          "Accept-Language": "hr,en",
        },
      },
    );

    if (!geoRes.ok) {
      const text = await geoRes.text();
      return res.status(500).json({
        success: false,
        message: "Greška kod geocoding zahtjeva.",
        details: text,
      });
    }

    const results = await geoRes.json();

    if (!Array.isArray(results) || !results.length) {
      return res.status(404).json({
        success: false,
        message: "Lokacija nije pronađena.",
      });
    }

    const best = results[0];

    return res.json({
      success: true,
      result: {
        latitude: Number(best.lat),
        longitude: Number(best.lon),
        displayName: best.display_name || "",
      },
    });
  } catch (err) {
    console.error("Greška kod geocodinga:", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod geocodinga.",
      error: err.message,
    });
  }
});

app.post("/api/search-listings", (req, res) => {
  try {
    const {
      listings = [],
      search = "",
      location = "",
      maxPrice = "",
      minRating = "",
      onlyActive = true,
      checkIn = "",
      checkOut = "",
    } = req.body || {};

    let result = Array.isArray(listings) ? [...listings] : [];

    const eventsData = readEvents();
    const reservationEvents = Array.isArray(eventsData.reservations)
      ? eventsData.reservations
      : [];
    const cancellationEvents = Array.isArray(eventsData.cancellations)
      ? eventsData.cancellations
      : [];

    if (String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      result = result.filter((listing) => {
        return (
          String(listing.title || "")
            .toLowerCase()
            .includes(q) ||
          String(listing.location || "")
            .toLowerCase()
            .includes(q)
        );
      });
    }

    if (String(location).trim()) {
      const loc = String(location).trim().toLowerCase();
      result = result.filter(
        (listing) => String(listing.location || "").toLowerCase() === loc,
      );
    }

    if (maxPrice !== "" && maxPrice !== null && maxPrice !== undefined) {
      result = result.filter(
        (listing) => Number(listing.pricePerNight || 0) <= Number(maxPrice),
      );
    }

    if (minRating !== "" && minRating !== null && minRating !== undefined) {
      result = result.filter(
        (listing) => Number(listing.averageRating || 0) >= Number(minRating),
      );
    }

    if (onlyActive) {
      result = result.filter((listing) => Boolean(listing.isActive));
    }

    if (checkIn && checkOut) {
      const checkInTs = toUnixTimestamp(checkIn);
      const checkOutTs = toUnixTimestamp(checkOut);

      result = result.filter((listing) => {
        const listingId = String(listing.id);

        const relatedReservations = reservationEvents.filter(
          (reservation) => String(reservation.listingId) === listingId,
        );

        const cancelledReservationIds = new Set(
          cancellationEvents.map((item) => String(item.id)),
        );

        const activeReservations = relatedReservations.filter(
          (reservation) => !cancelledReservationIds.has(String(reservation.id)),
        );

        const hasOverlap = activeReservations.some((reservation) =>
          reservationsOverlap(
            checkInTs,
            checkOutTs,
            Number(reservation.checkInDate),
            Number(reservation.checkOutDate),
          ),
        );

        return !hasOverlap;
      });
    }

    return res.json({
      success: true,
      listings: result,
    });
  } catch (err) {
    console.error("Greška kod search-listings:", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod napredne pretrage oglasa.",
      error: err.message,
    });
  }
});

app.get("/api/analytics/host/:wallet", (req, res) => {
  try {
    const wallet = normalizeAddress(req.params.wallet);
    const events = readEvents();

    const reservations = Array.isArray(events.reservations)
      ? events.reservations
      : [];
    const payouts = Array.isArray(events.payouts) ? events.payouts : [];
    const cancellations = Array.isArray(events.cancellations)
      ? events.cancellations
      : [];
    const reviews = Array.isArray(events.reviews) ? events.reviews : [];

    const cancelledReservationIds = new Set(
      cancellations.map((item) => String(item.id)),
    );

    const hostReservations = reservations.filter(
      (reservation) => normalizeAddress(reservation.host) === wallet,
    );

    const completedReservationIds = new Set(
      payouts
        .filter((item) => normalizeAddress(item.host) === wallet)
        .map((item) => String(item.id)),
    );

    const activeReservations = hostReservations.filter(
      (reservation) =>
        !cancelledReservationIds.has(String(reservation.id)) &&
        !completedReservationIds.has(String(reservation.id)),
    );

    const completedReservations = hostReservations.filter((reservation) =>
      completedReservationIds.has(String(reservation.id)),
    );

    const cancelledReservations = hostReservations.filter((reservation) =>
      cancelledReservationIds.has(String(reservation.id)),
    );

    const totalEarnedWei = payouts
      .filter((item) => normalizeAddress(item.host) === wallet)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const pendingAmountWei = activeReservations.reduce(
      (sum, reservation) => sum + Number(reservation.totalPrice || 0),
      0,
    );

    const { totalReviews, averageRating } = calculateAverageRating(
      reviews,
      wallet,
    );

    const listingsMap = new Map();

    hostReservations.forEach((reservation) => {
      const key = String(reservation.listingId);

      if (!listingsMap.has(key)) {
        listingsMap.set(key, {
          listingId: key,
          reservationsCount: 0,
          completedCount: 0,
          activeCount: 0,
          cancelledCount: 0,
          earnedWei: 0,
          pendingWei: 0,
          earnedEth: 0,
          pendingEth: 0,
        });
      }

      const item = listingsMap.get(key);
      item.reservationsCount += 1;

      if (cancelledReservationIds.has(String(reservation.id))) {
        item.cancelledCount += 1;
      } else if (completedReservationIds.has(String(reservation.id))) {
        item.completedCount += 1;
        item.earnedWei += Number(reservation.totalPrice || 0);
      } else {
        item.activeCount += 1;
        item.pendingWei += Number(reservation.totalPrice || 0);
      }

      item.earnedEth = formatEthFromWei(item.earnedWei);
      item.pendingEth = formatEthFromWei(item.pendingWei);
    });

    return res.json({
      success: true,
      analytics: {
        hostWallet: wallet,
        totalListings: [
          ...new Set(hostReservations.map((x) => String(x.listingId))),
        ].length,
        totalReservations: hostReservations.length,
        activeReservations: activeReservations.length,
        completedReservations: completedReservations.length,
        cancelledReservations: cancelledReservations.length,
        totalEarnedWei,
        totalEarnedEth: formatEthFromWei(totalEarnedWei),
        pendingAmountWei,
        pendingAmountEth: formatEthFromWei(pendingAmountWei),
        totalReviewsReceived: totalReviews,
        averageRating,
        listingsBreakdown: Array.from(listingsMap.values()),
      },
    });
  } catch (err) {
    console.error("Greška kod host analytics:", err);
    return res.status(500).json({
      success: false,
      message: "Greška kod dohvaćanja host analitike.",
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend radi na portu ${PORT}`);
  startBlockchainListener();
});
