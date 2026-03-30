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

const profilesPath = path.join(__dirname, "data", "profiles.json");

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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend radi na portu ${PORT}`);
});
