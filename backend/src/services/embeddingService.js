import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const EMBEDDINGS_PATH = path.join(DATA_DIR, "listingEmbeddings.json");

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function ensureEmbeddingsFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EMBEDDINGS_PATH))
    fs.writeFileSync(EMBEDDINGS_PATH, "[]", "utf8");
}

function readEmbeddings() {
  try {
    ensureEmbeddingsFile();
    return JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeEmbeddings(data) {
  ensureEmbeddingsFile();
  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(data, null, 2), "utf8");
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function buildListingText(listing) {
  return [
    `Title: ${listing.title || ""}`,
    `Location: ${listing.location || listing.locationTitle || ""}`,
    `Property type: ${listing.propertyType || ""}`,
    `Guests: ${listing.guestCount || ""}`,
    `Bedrooms: ${listing.bedrooms || ""}`,
    `Beds: ${listing.beds || ""}`,
    `Bathrooms: ${listing.bathrooms || ""}`,
    `Summary: ${listing.summary || ""}`,
    `Description: ${listing.descriptionShort || ""} ${listing.descriptionLong || ""}`,
    `Location description: ${listing.locationDescription || ""}`,
    `Amenities: ${Array.isArray(listing.amenities) ? listing.amenities.join(", ") : ""}`,
    `Highlights: ${
      Array.isArray(listing.highlights)
        ? listing.highlights
            .map((x) => `${x.title} ${x.description}`)
            .join(", ")
        : ""
    }`,
    `Sleeping: ${
      Array.isArray(listing.sleepingArrangements)
        ? listing.sleepingArrangements
            .map((x) => `${x.title} ${x.subtitle}`)
            .join(", ")
        : ""
    }`,
  ].join("\n");
}

async function createEmbedding(text) {
  const openai = getOpenAIClient();

  if (!openai) {
    console.warn("OPENAI_API_KEY is missing. Embeddings are disabled.");
    return null;
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function syncListingEmbeddings(listings) {
  const existing = readEmbeddings();
  const updated = [...existing];

  for (const listing of listings) {
    const listingId = Number(listing.listingId || listing.id);
    if (!listingId) continue;

    const text = buildListingText(listing);
    const textHash = hashText(text);

    const existingIndex = updated.findIndex(
      (x) => Number(x.listingId) === listingId,
    );

    if (
      existingIndex >= 0 &&
      updated[existingIndex].textHash === textHash &&
      Array.isArray(updated[existingIndex].embedding)
    ) {
      continue;
    }

    const embedding = await createEmbedding(text);
    if (!embedding) continue;

    const item = {
      listingId,
      textHash,
      text,
      embedding,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) updated[existingIndex] = item;
    else updated.push(item);
  }

  writeEmbeddings(updated);
  return updated;
}

export {
  readEmbeddings,
  syncListingEmbeddings,
  createEmbedding,
  cosineSimilarity,
  buildListingText,
};
