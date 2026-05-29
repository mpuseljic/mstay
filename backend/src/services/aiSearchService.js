import path from "path";
import { fileURLToPath } from "url";

import {
  readJsonSafe,
  normalizeText,
  toEthFromWei,
  includesAny,
} from "../utils/aiHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");

function extractFiltersFromMessage(message) {
  const text = normalizeText(message);

  const filters = {
    location: null,
    guestCount: null,
    maxPrice: null,
    amenities: [],
    propertyType: null,
  };

  const knownLocations = [
    "pula",
    "zagreb",
    "split",
    "rijeka",
    "zadar",
    "dubrovnik",
    "osijek",
    "rovinj",
    "medulin",
    "opatija",
  ];

  for (const location of knownLocations) {
    if (text.includes(location)) {
      filters.location = location;
      break;
    }
  }

  const guestMatch = text.match(
    /(\d+)\s*(gost|gosta|guest|guests|person|people|osob|osobe|osoba)/i,
  );

  if (guestMatch) {
    filters.guestCount = Number(guestMatch[1]);
  }

  const priceMatch =
    text.match(/(?:under|below|do|ispod|max|maksimalno)\s*(\d+)/i) ||
    text.match(/(\d+)\s*(eur|eura|€)/i);

  if (priceMatch) {
    filters.maxPrice = Number(priceMatch[1]);
  }

  const amenityMap = [
    { key: "parking", words: ["parking", "parkirno", "parkiraliste"] },
    { key: "wifi", words: ["wifi", "wi-fi", "internet"] },
    { key: "pool", words: ["pool", "bazen"] },
    { key: "sea view", words: ["sea view", "pogled na more", "more"] },
    { key: "air conditioning", words: ["air conditioning", "klima", "ac"] },
    {
      key: "pets allowed",
      words: ["pets", "pet friendly", "kucni ljubimci", "pas"],
    },
  ];

  amenityMap.forEach((item) => {
    if (includesAny(text, item.words)) {
      filters.amenities.push(item.key);
    }
  });

  if (includesAny(text, ["apartment", "apartman"])) {
    filters.propertyType = "apartment";
  }

  if (includesAny(text, ["house", "kuca", "villa", "vila"])) {
    filters.propertyType = "house";
  }

  return filters;
}

function getAllListingsForSearch() {
  const listingDetailsStore = readJsonSafe(
    path.join(DATA_DIR, "listingDetails.json"),
    {},
  );

  const listings = Object.entries(listingDetailsStore).map(
    ([listingId, details]) => ({
      listingId: Number(listingId),
      ...details,
    }),
  );

  return listings;
}

function calculateSearchScore(listing, filters) {
  let score = 0;
  const reasons = [];

  const locationText = normalizeText(
    `${listing.locationTitle || ""} ${listing.locationDescription || ""} ${listing.location || ""}`,
  );

  if (filters.location && locationText.includes(filters.location)) {
    score += 35;
    reasons.push(`Location matches ${filters.location}`);
  }

  if (
    filters.guestCount &&
    Number(listing.guestCount || 0) >= filters.guestCount
  ) {
    score += 20;
    reasons.push(`Suitable for ${filters.guestCount} guests`);
  }

  const price = Number(listing.pricePerNight || listing.price || 0);

  if (filters.maxPrice && price > 0 && price <= filters.maxPrice) {
    score += 20;
    reasons.push(`Price is within the requested budget`);
  }

  const amenities = Array.isArray(listing.amenities) ? listing.amenities : [];
  const normalizedAmenities = amenities.map(normalizeText);

  filters.amenities.forEach((amenity) => {
    const hasAmenity = normalizedAmenities.some((a) =>
      a.includes(normalizeText(amenity)),
    );

    if (hasAmenity) {
      score += 10;
      reasons.push(`Has ${amenity}`);
    }
  });

  if (
    filters.propertyType &&
    normalizeText(listing.propertyType).includes(filters.propertyType)
  ) {
    score += 15;
    reasons.push(`Property type matches`);
  }

  return {
    score,
    reasons,
  };
}

function aiSearchListings(message) {
  const filters = extractFiltersFromMessage(message);
  const listings = getAllListingsForSearch();

  const results = listings
    .map((listing) => {
      const result = calculateSearchScore(listing, filters);

      return {
        listingId: listing.listingId,
        title:
          listing.title ||
          listing.locationTitle ||
          `Listing #${listing.listingId}`,
        locationTitle: listing.locationTitle || "",
        locationDescription: listing.locationDescription || "",
        propertyType: listing.propertyType || "",
        guestCount: listing.guestCount || null,
        pricePerNight: listing.pricePerNight || listing.price || null,
        amenities: listing.amenities || [],
        score: result.score,
        reasons: result.reasons,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    message,
    filters,
    results,
  };
}

export { aiSearchListings, extractFiltersFromMessage };
