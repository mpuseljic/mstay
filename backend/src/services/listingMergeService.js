import path from "path";
import { fileURLToPath } from "url";

import { readEvents } from "../utils/eventsStore.js";
import { readJsonSafe } from "../utils/aiHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

function normalizeListingId(value) {
  return Number(value || 0);
}

function getListingDetails() {
  const data = readJsonSafe(path.join(DATA_DIR, "listingDetails.json"), []);

  if (Array.isArray(data)) return data;

  return Object.entries(data).map(([listingId, details]) => ({
    listingId: Number(listingId),
    ...details,
  }));
}

function getBaseListingsFromEvents() {
  const events = readEvents();
  const base = Array.isArray(events.listings) ? events.listings : [];

  return base.map((listing) => {
    const rawImageUrls =
      listing.imageUrls ||
      listing.images ||
      (typeof listing.pricePerNight === "string" &&
      listing.pricePerNight.includes("http")
        ? listing.pricePerNight
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : []);

    const cleanPrice =
      typeof listing.pricePerNight === "string" &&
      listing.pricePerNight.includes("http")
        ? null
        : listing.pricePerNight || listing.price || null;

    return {
      id: normalizeListingId(listing.id || listing.listingId),
      listingId: normalizeListingId(listing.id || listing.listingId),
      host: listing.host || listing.owner || listing.hostAddress || "",
      title: listing.title || "",
      location: listing.location || "",
      imageUrls: Array.isArray(rawImageUrls) ? rawImageUrls : [],
      imageUrl:
        listing.imageUrl ||
        (Array.isArray(rawImageUrls) ? rawImageUrls[0] : "") ||
        "",
      pricePerNight: cleanPrice,
      isActive: listing.isActive ?? true,
    };
  });
}

function mergeListings() {
  const baseListings = getBaseListingsFromEvents();
  const details = getListingDetails();

  const ids = new Set([
    ...baseListings.map((x) => normalizeListingId(x.listingId)),
    ...details.map((x) => normalizeListingId(x.listingId)),
  ]);

  return Array.from(ids)
    .filter(Boolean)
    .map((id) => {
      const base =
        baseListings.find((x) => normalizeListingId(x.listingId) === id) || {};

      const detail =
        details.find((x) => normalizeListingId(x.listingId) === id) || {};

      return {
        ...detail,
        ...base,

        id,
        listingId: id,

        title: base.title || detail.title || `Listing #${id}`,

        location:
          base.location || detail.baseLocation || detail.locationTitle || "",
        locationTitle: detail.locationTitle || base.location || "",
        locationDescription: detail.locationDescription || "",

        hostAddress: detail.hostAddress || base.host || "",
        host: base.host || detail.hostAddress || "",

        imageUrls:
          Array.isArray(base.imageUrls) && base.imageUrls.length
            ? base.imageUrls
            : Array.isArray(detail.imageUrls)
              ? detail.imageUrls
              : [],

        imageUrl:
          base.imageUrl ||
          base.imageUrls?.[0] ||
          detail.imageUrl ||
          detail.imageUrls?.[0] ||
          detail.sleepingArrangements?.find((x) => x.imageUrl)?.imageUrl ||
          "",

        pricePerNight:
          base.pricePerNight || detail.pricePerNight || detail.price || null,
        isActive: base.isActive ?? detail.isActive ?? true,
      };
    });
}

export { mergeListings, getListingDetails };
