import path from "path";
import { fileURLToPath } from "url";

import { readJsonSafe, normalizeText } from "../utils/aiHelpers.js";
import { mergeListings } from "./listingMergeService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

function sameAddress(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function getEventsStore() {
  return readJsonSafe(path.join(DATA_DIR, "blockchainEvents.json"), {
    reservations: [],
    reviews: [],
    payouts: [],
    cancellations: [],
  });
}

function getAllListings() {
  return mergeListings();
}

function getCancelledReservationIds() {
  const events = getEventsStore();

  return new Set((events.cancellations || []).map((item) => String(item.id)));
}

function getGuestReservations(walletAddress) {
  const events = getEventsStore();
  const cancelledIds = getCancelledReservationIds();

  return (events.reservations || [])
    .filter((reservation) => sameAddress(reservation.guest, walletAddress))
    .filter((reservation) => !cancelledIds.has(String(reservation.id)));
}

function getUniqueReservedListingIds(walletAddress) {
  return [
    ...new Set(
      getGuestReservations(walletAddress)
        .map((reservation) => Number(reservation.listingId))
        .filter(Boolean),
    ),
  ];
}

function getMostFrequentValueMap(values) {
  return values.reduce((acc, value) => {
    const key = normalizeText(value);

    if (!key) return acc;

    acc[key] = (acc[key] || 0) + 1;

    return acc;
  }, {});
}

function getListingLocationTokens(listing) {
  const text = normalizeText(
    `${listing.location || ""} ${listing.locationTitle || ""} ${listing.locationDescription || ""}`,
  );

  return [
    ...new Set(
      text
        .split(/[\s,.-]+/)
        .map((x) => x.trim())
        .filter((x) => x.length >= 3),
    ),
  ];
}

function buildGuestProfile(walletAddress) {
  const listings = getAllListings();
  const reservedListingIds = getUniqueReservedListingIds(walletAddress);

  const reservedListings = reservedListingIds
    .map((id) => listings.find((listing) => Number(listing.listingId) === id))
    .filter(Boolean);

  const locationTokens = reservedListings.flatMap(getListingLocationTokens);

  const propertyTypes = reservedListings
    .map((listing) => listing.propertyType)
    .filter(Boolean);

  const amenities = reservedListings.flatMap((listing) =>
    Array.isArray(listing.amenities) ? listing.amenities : [],
  );

  const guestCounts = reservedListings
    .map((listing) => Number(listing.guestCount || 0))
    .filter((x) => x > 0);

  const prices = reservedListings
    .map((listing) => Number(listing.pricePerNight || listing.price || 0))
    .filter((x) => x > 0);

  return {
    walletAddress,
    reservationCount: getGuestReservations(walletAddress).length,
    uniqueReservationCount: reservedListingIds.length,
    reservedListingIds,
    locationTokens: getMostFrequentValueMap(locationTokens),
    propertyTypes: getMostFrequentValueMap(propertyTypes),
    amenities: getMostFrequentValueMap(amenities),
    preferredGuestCount: guestCounts.length ? Math.max(...guestCounts) : 0,
    averagePrice:
      prices.length > 0
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length
        : 0,
  };
}

function scoreListing(listing, profile) {
  let points = 0;
  let maxPoints = 0;
  const reasons = [];

  const listingLocationTokens = getListingLocationTokens(listing);

  const preferredLocationTokens = Object.keys(profile.locationTokens);
  maxPoints += preferredLocationTokens.length ? 30 : 0;

  const hasLocationMatch = preferredLocationTokens.some((token) =>
    listingLocationTokens.includes(token),
  );

  if (hasLocationMatch) {
    points += 30;
    reasons.push("Similar location to your previous stay");
  }

  const listingType = normalizeText(listing.propertyType || "");
  const preferredTypes = Object.keys(profile.propertyTypes);
  maxPoints += preferredTypes.length ? 20 : 0;

  const hasTypeMatch = preferredTypes.some(
    (type) => listingType.includes(type) || type.includes(listingType),
  );

  if (hasTypeMatch) {
    points += 20;
    reasons.push("Similar accommodation type");
  }

  const listingAmenities = Array.isArray(listing.amenities)
    ? listing.amenities.map(normalizeText)
    : [];

  const preferredAmenities = Object.keys(profile.amenities);
  const matchedAmenities = preferredAmenities.filter((amenity) =>
    listingAmenities.some(
      (item) => item.includes(amenity) || amenity.includes(item),
    ),
  );

  if (preferredAmenities.length) {
    maxPoints += 30;

    const amenityRatio =
      matchedAmenities.length / Math.max(preferredAmenities.length, 1);

    points += Math.round(30 * amenityRatio);

    if (matchedAmenities.length) {
      reasons.push(
        `Matches ${matchedAmenities.length} preferred amenity${
          matchedAmenities.length === 1 ? "" : "ies"
        }`,
      );
    }
  }

  if (profile.preferredGuestCount) {
    maxPoints += 10;

    if (Number(listing.guestCount || 0) >= profile.preferredGuestCount) {
      points += 10;
      reasons.push("Suitable guest capacity");
    }
  }

  const price = Number(listing.pricePerNight || listing.price || 0);

  if (profile.averagePrice && price > 0) {
    maxPoints += 10;

    const difference = Math.abs(price - profile.averagePrice);
    const isSimilarPrice = difference <= profile.averagePrice * 0.3;

    if (isSimilarPrice) {
      points += 10;
      reasons.push("Similar price range");
    }
  }

  const score = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 50;

  return {
    score: Math.max(1, Math.min(score, 98)),
    reasons:
      reasons.length > 0
        ? [...new Set(reasons)]
        : ["Recommended from available stays"],
  };
}

function mapListing(listing, result) {
  return {
    listingId: Number(listing.listingId),
    title: listing.title || `Listing #${listing.listingId}`,
    location: listing.location || "",
    locationTitle: listing.locationTitle || listing.location || "",
    locationDescription: listing.locationDescription || "",
    pricePerNight: listing.pricePerNight || listing.price || null,
    imageUrls: listing.imageUrls || [],
    imageUrl: listing.imageUrl || listing.imageUrls?.[0] || "",
    summary: listing.summary || "",
    hostAddress: listing.hostAddress || listing.host || "",
    propertyType: listing.propertyType || "",
    guestCount: listing.guestCount || null,
    bedrooms: listing.bedrooms || null,
    beds: listing.beds || null,
    bathrooms: listing.bathrooms || null,
    amenities: listing.amenities || [],
    sleepingArrangements: listing.sleepingArrangements || [],
    coverImage: listing.coverImage || "",
    score: result.score,
    reasons: result.reasons,
  };
}

function getRecommendations(walletAddress) {
  const listings = getAllListings();
  const profile = buildGuestProfile(walletAddress);
  const normalizedWallet = normalizeText(walletAddress);

  const candidateListings = listings.filter((listing) => {
    const listingHost = listing.hostAddress || listing.host || "";

    const isOwnListing =
      listingHost && normalizeText(listingHost) === normalizedWallet;

    const alreadyReserved = profile.reservedListingIds.includes(
      Number(listing.listingId),
    );

    const isInactive = listing.isActive === false;

    return !isOwnListing && !alreadyReserved && !isInactive;
  });

  const recommendations = candidateListings
    .map((listing) => {
      const result = scoreListing(listing, profile);

      return mapListing(listing, result);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    walletAddress,
    debug: {
      totalListings: listings.length,
      reservationCount: profile.reservationCount,
      uniqueReservationCount: profile.uniqueReservationCount,
      reservedListingIds: profile.reservedListingIds,
      candidateListingsCount: candidateListings.length,
    },
    profile,
    reservedListingIds: profile.reservedListingIds,
    recommendations,
    message:
      recommendations.length > 0
        ? "Recommendations generated from previous reservation preferences."
        : "No recommendation candidates available. The user has already reserved all available listings or only owns the remaining listings.",
  };
}

export { getRecommendations };
