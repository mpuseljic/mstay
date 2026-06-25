import path from "path";
import { fileURLToPath } from "url";

import { readJsonSafe, normalizeText } from "../utils/aiHelpers.js";
import { mergeListings } from "./listingMergeService.js";
import {
  readEmbeddings,
  syncListingEmbeddings,
  createEmbedding,
  cosineSimilarity,
} from "./embeddingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

function sameAddress(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function getEventsStore() {
  return readJsonSafe(path.join(DATA_DIR, "blockchainEvents.json"), {
    reservations: [],
    cancellations: [],
  });
}

function getCancelledReservationIds() {
  const events = getEventsStore();
  return new Set((events.cancellations || []).map((x) => String(x.id)));
}

function getActiveGuestReservations(walletAddress) {
  const events = getEventsStore();
  const cancelledIds = getCancelledReservationIds();

  return (events.reservations || [])
    .filter((r) => sameAddress(r.guest, walletAddress))
    .filter((r) => !cancelledIds.has(String(r.id)));
}

function getReservedListingIds(walletAddress) {
  return [
    ...new Set(
      getActiveGuestReservations(walletAddress)
        .map((r) => Number(r.listingId))
        .filter(Boolean),
    ),
  ];
}

function locationTokens(listing) {
  return normalizeText(
    `${listing.location || ""} ${listing.locationTitle || ""} ${listing.locationDescription || ""}`,
  )
    .split(/[\s,.-]+/)
    .filter((x) => x.length >= 3);
}

function buildUserPreferenceText(walletAddress, listings) {
  const reservedIds = getReservedListingIds(walletAddress);

  const reservedListings = reservedIds
    .map((id) => listings.find((x) => Number(x.listingId) === id))
    .filter(Boolean);

  if (!reservedListings.length) {
    return "User has no previous reservations. Recommend active stays with complete descriptions, useful amenities and good guest capacity.";
  }

  return reservedListings
    .map((listing) =>
      [
        `Previously booked: ${listing.title || ""}`,
        `Location: ${listing.location || listing.locationTitle || ""}`,
        `Property type: ${listing.propertyType || ""}`,
        `Capacity: ${listing.guestCount || ""} guests`,
        `Price: ${listing.pricePerNight || ""}`,
        `Amenities: ${Array.isArray(listing.amenities) ? listing.amenities.join(", ") : ""}`,
        `Description: ${listing.summary || ""} ${listing.descriptionShort || ""}`,
      ].join("\n"),
    )
    .join("\n\n");
}

function buildProfile(walletAddress, listings) {
  const reservedIds = getReservedListingIds(walletAddress);

  const reservedListings = reservedIds
    .map((id) => listings.find((x) => Number(x.listingId) === id))
    .filter(Boolean);

  const amenities = new Set();
  const types = new Set();
  const locations = new Set();

  let preferredGuestCount = 0;
  let priceSum = 0;
  let priceCount = 0;

  reservedListings.forEach((listing) => {
    locationTokens(listing).forEach((x) => locations.add(x));

    if (listing.propertyType) types.add(normalizeText(listing.propertyType));

    if (Array.isArray(listing.amenities)) {
      listing.amenities.forEach((x) => amenities.add(normalizeText(x)));
    }

    preferredGuestCount = Math.max(
      preferredGuestCount,
      Number(listing.guestCount || 0),
    );

    const price = Number(listing.pricePerNight || listing.price || 0);
    if (price > 0) {
      priceSum += price;
      priceCount += 1;
    }
  });

  return {
    walletAddress,
    reservationCount: getActiveGuestReservations(walletAddress).length,
    uniqueReservationCount: reservedIds.length,
    reservedListingIds: reservedIds,
    amenities: [...amenities],
    propertyTypes: [...types],
    locationTokens: [...locations],
    preferredGuestCount,
    averagePrice: priceCount ? priceSum / priceCount : 0,
  };
}

function calculateRuleScore(listing, profile) {
  let score = 0;
  const reasons = [];

  const listingLocations = locationTokens(listing);

  if (profile.locationTokens.some((x) => listingLocations.includes(x))) {
    score += 20;
    reasons.push("Matches similar location");
  }

  const listingType = normalizeText(listing.propertyType || "");
  if (
    profile.propertyTypes.some(
      (x) => listingType.includes(x) || x.includes(listingType),
    )
  ) {
    score += 15;
    reasons.push("Matches accommodation type");
  }

  const listingAmenities = Array.isArray(listing.amenities)
    ? listing.amenities.map(normalizeText)
    : [];

  const matchedAmenities = profile.amenities.filter((amenity) =>
    listingAmenities.some((x) => x.includes(amenity) || amenity.includes(x)),
  );

  if (profile.amenities.length) {
    const ratio = matchedAmenities.length / profile.amenities.length;
    score += Math.round(25 * ratio);

    if (matchedAmenities.length) reasons.push("Matches preferred amenities");
  }

  if (
    profile.preferredGuestCount &&
    Number(listing.guestCount || 0) >= profile.preferredGuestCount
  ) {
    score += 10;
    reasons.push("Suitable guest capacity");
  }

  const price = Number(listing.pricePerNight || listing.price || 0);
  if (profile.averagePrice && price > 0) {
    const diff = Math.abs(price - profile.averagePrice);
    if (diff <= profile.averagePrice * 0.3) {
      score += 10;
      reasons.push("Similar price range");
    }
  }

  return { score: Math.min(score, 80), reasons };
}

function mapListing(listing, score, semanticScore, ruleScore, reasons) {
  const roomImage = Array.isArray(listing.sleepingArrangements)
    ? listing.sleepingArrangements.find((x) => x.imageUrl)?.imageUrl
    : "";

  return {
    listingId: Number(listing.listingId),
    title: listing.title || `Listing #${listing.listingId}`,
    location: listing.location || "",
    locationTitle: listing.locationTitle || listing.location || "",
    locationDescription: listing.locationDescription || "",
    pricePerNight: listing.pricePerNight || listing.price || null,
    imageUrls: listing.imageUrls || [],
    imageUrl: listing.imageUrl || listing.imageUrls?.[0] || roomImage || "",
    summary: listing.summary || "",
    hostAddress: listing.hostAddress || listing.host || "",
    propertyType: listing.propertyType || "",
    guestCount: listing.guestCount || null,
    bedrooms: listing.bedrooms || null,
    beds: listing.beds || null,
    bathrooms: listing.bathrooms || null,
    amenities: listing.amenities || [],
    sleepingArrangements: listing.sleepingArrangements || [],
    score,
    semanticScore,
    ruleScore,
    reasons,
  };
}

async function getRecommendations(walletAddress) {
  const listings = mergeListings();

  await syncListingEmbeddings(listings);

  const embeddings = readEmbeddings();
  const profile = buildProfile(walletAddress, listings);
  const userText = buildUserPreferenceText(walletAddress, listings);
  const userEmbedding = await createEmbedding(userText);

  const normalizedWallet = normalizeText(walletAddress);

  const candidates = listings.filter((listing) => {
    const host = listing.hostAddress || listing.host || "";
    const isOwn = host && normalizeText(host) === normalizedWallet;
    const reserved = profile.reservedListingIds.includes(
      Number(listing.listingId),
    );
    const inactive = listing.isActive === false;

    return !isOwn && !reserved && !inactive;
  });

  const recommendations = candidates
    .map((listing) => {
      const listingEmbedding = embeddings.find(
        (x) => Number(x.listingId) === Number(listing.listingId),
      );

      const rawSemantic =
        userEmbedding && listingEmbedding?.embedding
          ? cosineSimilarity(userEmbedding, listingEmbedding.embedding)
          : 0;

      const semanticScore = Math.round(Math.max(0, rawSemantic) * 100);
      const ruleResult = calculateRuleScore(listing, profile);
      const ruleScore = ruleResult.score;

      const finalScore = Math.min(
        Math.round(semanticScore * 0.7 + ruleScore * 0.3),
        98,
      );

      const reasons = [
        semanticScore > 70
          ? "AI semantic similarity with previous stays"
          : null,
        ...ruleResult.reasons,
      ].filter(Boolean);

      return mapListing(
        listing,
        finalScore,
        semanticScore,
        ruleScore,
        reasons.length ? reasons : ["AI recommended from available stays"],
      );
    })
    .filter((listing) => {
      if (profile.uniqueReservationCount === 0) {
        return listing.score >= 35;
      }

      return listing.score >= 45 || listing.ruleScore > 0;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    walletAddress,
    profile,
    debug: {
      totalListings: listings.length,
      candidateListingsCount: candidates.length,
      reservedListingIds: profile.reservedListingIds,
      embeddingsCount: embeddings.length,
      aiEnabled: Boolean(process.env.OPENAI_API_KEY),
    },
    recommendations,
  };
}

export { getRecommendations };
