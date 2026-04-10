import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend radi na portu ${PORT}`);
});
