import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend radi na portu ${PORT}`);
});
