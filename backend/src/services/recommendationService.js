import path from "path";
import { fileURLToPath } from "url";

import { readJsonSafe, normalizeText } from "../utils/aiHelpers.js";

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

function getListingDetails() {
  const data = readJsonSafe(path.join(DATA_DIR, "listingDetails.json"), []);
  return Array.isArray(data)
    ? data
    : Object.entries(data).map(([listingId, details]) => ({
        listingId: Number(listingId),
        ...details,
      }));
}

function getGuestReservations(walletAddress) {
  const events = getEventsStore();
  return (events.reservations || []).filter((reservation) =>
    sameAddress(reservation.guest, walletAddress),
  );
}

function getCancelledReservationIds() {
  const events = getEventsStore();
  return new Set((events.cancellations || []).map((item) => String(item.id)));
}

function getActiveGuestReservations(walletAddress) {
  const cancelledIds = getCancelledReservationIds();

  return getGuestReservations(walletAddress).filter(
    (reservation) => !cancelledIds.has(String(reservation.id)),
  );
}

function getReservedListingIds(walletAddress) {
  return getActiveGuestReservations(walletAddress)
    .map((reservation) => Number(reservation.listingId))
    .filter(Boolean);
}

function buildGuestProfile(walletAddress) {
  const reservations = getActiveGuestReservations(walletAddress);
  const listings = getListingDetails();

  const profile = {
    walletAddress,
    reservationCount: reservations.length,
    locations: {},
    propertyTypes: {},
    amenities: {},
    preferredGuestCount: 0,
    averagePrice: 0,
  };

  let priceSum = 0;
  let priceCount = 0;

  reservations.forEach((reservation) => {
    const listing = listings.find(
      (item) => Number(item.listingId) === Number(reservation.listingId),
    );

    if (!listing) return;

    const location = normalizeText(
      listing.locationTitle || listing.locationDescription || "",
    );
    const propertyType = normalizeText(listing.propertyType || "");

    if (location)
      profile.locations[location] = (profile.locations[location] || 0) + 1;
    if (propertyType)
      profile.propertyTypes[propertyType] =
        (profile.propertyTypes[propertyType] || 0) + 1;

    if (Array.isArray(listing.amenities)) {
      listing.amenities.forEach((amenity) => {
        const key = normalizeText(amenity);
        if (key) profile.amenities[key] = (profile.amenities[key] || 0) + 1;
      });
    }

    if (Number(listing.guestCount || 0) > profile.preferredGuestCount) {
      profile.preferredGuestCount = Number(listing.guestCount || 0);
    }

    const price = Number(listing.pricePerNight || listing.price || 0);
    if (price > 0) {
      priceSum += price;
      priceCount += 1;
    }
  });

  profile.averagePrice = priceCount ? priceSum / priceCount : 0;

  return profile;
}

function scoreListing(listing, profile) {
  let score = 0;
  const reasons = [];

  const locationText = normalizeText(
    `${listing.locationTitle || ""} ${listing.locationDescription || ""}`,
  );

  const propertyType = normalizeText(listing.propertyType || "");
  const amenities = Array.isArray(listing.amenities)
    ? listing.amenities.map(normalizeText)
    : [];

  Object.keys(profile.locations).forEach((location) => {
    if (location && locationText.includes(location)) {
      score += 35;
      reasons.push("Similar location to your previous stay");
    }
  });

  Object.keys(profile.propertyTypes).forEach((type) => {
    if (type && propertyType.includes(type)) {
      score += 25;
      reasons.push("Similar accommodation type");
    }
  });

  Object.keys(profile.amenities).forEach((amenity) => {
    if (amenities.some((item) => item.includes(amenity))) {
      score += 8;
      reasons.push(`Includes ${amenity}`);
    }
  });

  if (
    profile.preferredGuestCount &&
    Number(listing.guestCount || 0) >= profile.preferredGuestCount
  ) {
    score += 15;
    reasons.push("Suitable guest capacity");
  }

  const price = Number(listing.pricePerNight || listing.price || 0);

  if (profile.averagePrice && price > 0) {
    const difference = Math.abs(price - profile.averagePrice);

    if (difference <= profile.averagePrice * 0.25) {
      score += 12;
      reasons.push("Similar price range");
    }
  }

  return {
    score: Math.min(score, 98),
    reasons: [...new Set(reasons)],
  };
}

function mapListing(listing, result) {
  return {
    listingId: Number(listing.listingId),
    title:
      listing.title ||
      listing.summary ||
      listing.locationTitle ||
      `Listing #${listing.listingId}`,
    summary: listing.summary || "",
    hostAddress: listing.hostAddress || "",
    locationTitle: listing.locationTitle || "",
    locationDescription: listing.locationDescription || "",
    propertyType: listing.propertyType || "",
    guestCount: listing.guestCount || null,
    bedrooms: listing.bedrooms || null,
    beds: listing.beds || null,
    bathrooms: listing.bathrooms || null,
    amenities: listing.amenities || [],
    sleepingArrangements: listing.sleepingArrangements || [],
    imageUrl: listing.imageUrl || "",
    coverImage: listing.coverImage || "",
    score: result.score,
    reasons: result.reasons,
  };
}

function getRecommendations(walletAddress) {
  const listings = getListingDetails();
  const profile = buildGuestProfile(walletAddress);
  const reservedListingIds = getReservedListingIds(walletAddress);

  const availableListings = listings.filter((listing) => {
    const isOwnListing =
      listing.hostAddress && sameAddress(listing.hostAddress, walletAddress);

    const alreadyReserved = reservedListingIds.includes(
      Number(listing.listingId),
    );

    return !isOwnListing && !alreadyReserved;
  });

  let recommendations = availableListings
    .map((listing) => {
      const result = scoreListing(listing, profile);
      return mapListing(listing, result);
    })
    .filter((listing) => listing.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!recommendations.length) {
    recommendations = availableListings.slice(0, 6).map((listing) =>
      mapListing(listing, {
        score: profile.reservationCount > 0 ? 55 : 50,
        reasons: [
          profile.reservationCount > 0
            ? "Recommended from available stays"
            : "Recommended because you have no previous reservations yet",
        ],
      }),
    );
  }

  return {
    walletAddress,
    profile,
    reservedListingIds,
    recommendations: recommendations.slice(0, 6),
  };
}

export { getRecommendations };
