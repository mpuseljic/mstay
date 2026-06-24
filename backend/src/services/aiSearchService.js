import path from "path";
import { fileURLToPath } from "url";

import { readJsonSafe, normalizeText } from "../utils/aiHelpers.js";
import { mergeListings } from "./listingMergeService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

const STOP_WORDS = [
  "find",
  "show",
  "search",
  "give",
  "need",
  "want",
  "with",
  "that",
  "have",
  "has",
  "the",
  "and",
  "for",
  "from",
  "to",
  "me",
  "my",
  "please",
  "stay",
  "stays",
  "apartment",
  "apartments",
  "house",
  "houses",
  "villa",
  "villas",
  "nađi",
  "nadi",
  "pronađi",
  "pronadi",
  "pokaži",
  "pokazi",
  "trebam",
  "želim",
  "zelim",
  "meni",
  "mi",
  "koji",
  "koja",
  "koje",
  "ima",
  "imaju",
  "sa",
  "s",
  "i",
  "ili",
  "apartman",
  "apartmane",
  "kuća",
  "kuca",
  "vila",
  "smještaj",
  "smjestaj",
];

const SYNONYMS = {
  kitchen: ["kuhinja", "kuhinju", "kitchen", "cooking", "cook"],
  tv: ["tv", "television", "televizor", "smart tv"],
  "air conditioning": ["air conditioning", "klima", "klimu", "ac"],
  wifi: ["wifi", "wi-fi", "internet"],
  parking: ["parking", "parkiralište", "parkiraliste", "parkirno"],
  pool: ["pool", "bazen"],
  balcony: ["balcony", "balkon", "terasa", "terrace"],
  "sea view": ["sea view", "pogled na more", "more", "sea"],
  "washing machine": [
    "washing machine",
    "perilica",
    "perilica rublja",
    "veš mašina",
    "ves masina",
  ],
  heating: ["heating", "grijanje"],
  elevator: ["elevator", "lift"],
  workspace: ["workspace", "work desk", "radni stol"],
  pets: ["pets", "pet friendly", "kućni ljubimci", "kucni ljubimci", "pas"],
};

function hasWord(text, words) {
  return words.some((word) => {
    const normalizedWord = normalizeText(word);
    const pattern = new RegExp(
      `(^|\\s|,|\\.|\\?|!)${normalizedWord}(\\s|,|\\.|\\?|!|$)`,
      "i",
    );
    return pattern.test(text);
  });
}

function getAllListingsForSearch() {
  return mergeListings();
}

function getSearchableText(listing) {
  const parts = [
    listing.title,
    listing.location,
    listing.imageUrl,
    listing.summary,
    listing.descriptionShort,
    listing.descriptionLong,
    listing.propertyType,
    listing.locationTitle,
    listing.locationDescription,
    listing.pricePerNight,
    listing.price,
    listing.guestCount,
    listing.bedrooms,
    listing.beds,
    listing.bathrooms,

    ...(Array.isArray(listing.amenities) ? listing.amenities : []),
    ...(Array.isArray(listing.houseRules) ? listing.houseRules : []),

    ...(Array.isArray(listing.highlights)
      ? listing.highlights.flatMap((x) => [x.title, x.description])
      : []),

    ...(Array.isArray(listing.sleepingArrangements)
      ? listing.sleepingArrangements.flatMap((x) => [x.title, x.subtitle])
      : []),
  ];

  return normalizeText(parts.filter(Boolean).join(" "));
}

function getImportantWords(message) {
  return normalizeText(message)
    .split(/[\s,.;:!?]+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => word.length >= 2)
    .filter((word) => !STOP_WORDS.includes(word));
}

function getExpandedSearchTerms(words) {
  const terms = new Set(words);

  words.forEach((word) => {
    Object.entries(SYNONYMS).forEach(([mainTerm, variants]) => {
      const normalizedVariants = variants.map(normalizeText);

      if (
        normalizeText(mainTerm) === word ||
        normalizedVariants.includes(word)
      ) {
        terms.add(normalizeText(mainTerm));
        normalizedVariants.forEach((variant) => terms.add(variant));
      }
    });
  });

  return Array.from(terms);
}

function detectChatIntent(message) {
  const text = normalizeText(message);

  if (hasWord(text, ["hej", "hey", "hi", "hello", "bok", "cao", "ćao"])) {
    return "greeting";
  }

  if (
    text.includes("booking") ||
    text.includes("reservation") ||
    text.includes("rezerv") ||
    text.includes("metamask") ||
    text.includes("wallet") ||
    text.includes("escrow") ||
    text.includes("blockchain") ||
    text.includes("smart contract")
  ) {
    return "platform_question";
  }

  if (
    hasWord(text, ["help", "pomoc", "pomoć"]) ||
    text.includes("kako koristiti") ||
    text.includes("what can you do")
  ) {
    return "help";
  }

  const importantWords = getImportantWords(message);

  if (importantWords.length > 0) {
    return "listing_search";
  }

  return "general";
}

function extractFiltersFromMessage(message) {
  const text = normalizeText(message);

  const filters = {
    location: null,
    guestCount: null,
    maxPrice: null,
    amenities: [],
    propertyType: null,
    searchTerms: getExpandedSearchTerms(getImportantWords(message)),
  };

  const listings = getAllListingsForSearch();

  const locationsFromJson = listings
    .flatMap((listing) => [listing.locationTitle, listing.locationDescription])
    .filter(Boolean)
    .map(normalizeText)
    .flatMap((location) => location.split(/[\s,.-]+/))
    .filter((x) => x.length >= 3);

  const uniqueLocations = [...new Set(locationsFromJson)];

  for (const location of uniqueLocations) {
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

  if (text.includes("apartman") || text.includes("apartment")) {
    filters.propertyType = "apartment";
  }

  if (
    text.includes("house") ||
    text.includes("kuca") ||
    text.includes("kuća") ||
    text.includes("villa") ||
    text.includes("vila")
  ) {
    filters.propertyType = "house";
  }

  Object.entries(SYNONYMS).forEach(([mainTerm, variants]) => {
    const allTerms = [mainTerm, ...variants].map(normalizeText);

    if (allTerms.some((term) => text.includes(term))) {
      filters.amenities.push(mainTerm);
    }
  });

  filters.amenities = [...new Set(filters.amenities)];

  return filters;
}

function calculateSearchScore(listing, filters, message) {
  let score = 0;
  const reasons = [];

  const searchableText = getSearchableText(listing);
  const locationText = normalizeText(
    `${listing.locationTitle || ""} ${listing.locationDescription || ""}`,
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
    reasons.push("Price is within the requested budget");
  }

  if (
    filters.propertyType &&
    normalizeText(listing.propertyType || "").includes(filters.propertyType)
  ) {
    score += 20;
    reasons.push("Property type matches");
  }

  filters.amenities.forEach((amenity) => {
    const terms = getExpandedSearchTerms([normalizeText(amenity)]);

    if (terms.some((term) => searchableText.includes(term))) {
      score += 30;
      reasons.push(`Has ${amenity}`);
    }
  });

  filters.searchTerms.forEach((term) => {
    if (searchableText.includes(term)) {
      score += 12;
      reasons.push(`Matches "${term}"`);
    }
  });

  const exactPhrase = normalizeText(message);

  if (exactPhrase.length > 4 && searchableText.includes(exactPhrase)) {
    score += 30;
    reasons.push("Exact phrase match");
  }

  return {
    score: Math.min(score, 99),
    reasons: [...new Set(reasons)],
  };
}

function mapListingForSearch(listing, result) {
  return {
    listingId: Number(listing.listingId),
    title: listing.title || `Listing #${listing.listingId}`,
    summary: listing.summary || "",
    locationTitle: listing.locationTitle || "",
    locationDescription: listing.locationDescription || "",
    propertyType: listing.propertyType || "",
    guestCount: listing.guestCount || null,
    bedrooms: listing.bedrooms || null,
    beds: listing.beds || null,
    bathrooms: listing.bathrooms || null,
    pricePerNight: listing.pricePerNight || listing.price || null,
    amenities: listing.amenities || [],
    sleepingArrangements: listing.sleepingArrangements || [],
    imageUrl: listing.imageUrl || "",
    coverImage: listing.coverImage || "",
    score: result.score,
    reasons: result.reasons,
  };
}

function aiSearchListings(message) {
  const intent = detectChatIntent(message);

  if (intent === "greeting") {
    return {
      message,
      intent,
      answer:
        "Hi! I’m your mStay AI assistant. Tell me what kind of stay you need — for example location, guests, budget or amenities.",
      filters: null,
      results: [],
    };
  }

  if (intent === "help") {
    return {
      message,
      intent,
      answer:
        "I can search all saved listing details. Try: “Find me an apartment with kitchen, TV and air conditioning” or “Show me stays in Pula for 2 guests with parking”.",
      filters: null,
      results: [],
    };
  }

  if (intent === "platform_question") {
    return {
      message,
      intent,
      answer:
        "mStay uses MetaMask for wallet login and smart contract escrow. When a guest books a stay, the payment is locked in the contract and released to the host after the reservation is completed.",
      filters: null,
      results: [],
    };
  }

  if (intent === "general") {
    return {
      message,
      intent,
      answer:
        "I can help you find accommodation. Mention anything from the listing details, such as kitchen, TV, parking, location, guests or price.",
      filters: null,
      results: [],
    };
  }

  const filters = extractFiltersFromMessage(message);
  const listings = getAllListingsForSearch();

  const results = listings
    .map((listing) => {
      const result = calculateSearchScore(listing, filters, message);
      return mapListingForSearch(listing, result);
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    message,
    intent,
    answer:
      results.length > 0
        ? `I found ${results.length} matching stay${results.length === 1 ? "" : "s"} for you.`
        : "I could not find a matching stay. Check if those details are saved in the listing details, then try again.",
    filters,
    results,
  };
}

export { aiSearchListings, extractFiltersFromMessage };
