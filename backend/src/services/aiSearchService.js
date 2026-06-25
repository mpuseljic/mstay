import { normalizeText } from "../utils/aiHelpers.js";
import { mergeListings } from "./listingMergeService.js";
import {
  readEmbeddings,
  syncListingEmbeddings,
  createEmbedding,
  cosineSimilarity,
} from "./embeddingService.js";

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
];

const SYNONYMS = {
  kitchen: ["kuhinja", "kuhinju", "kitchen", "cooking", "cook"],
  tv: ["tv", "television", "televizor", "smart tv"],
  "air conditioning": [
    "air conditioning",
    "klima",
    "klimu",
    "ac",
    "hlađenje",
    "hladenje",
  ],
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
  workspace: ["workspace", "work desk", "radni stol", "poseban prostor za rad"],
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

  return "listing_search";
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

function extractFiltersFromMessage(message) {
  const text = normalizeText(message);
  const listings = mergeListings();

  const filters = {
    location: null,
    guestCount: null,
    maxPrice: null,
    amenities: [],
    propertyType: null,
    searchTerms: getExpandedSearchTerms(getImportantWords(message)),
  };

  const locationsFromData = listings
    .flatMap((listing) => [
      listing.location,
      listing.locationTitle,
      listing.locationDescription,
    ])
    .filter(Boolean)
    .map(normalizeText)
    .flatMap((location) => location.split(/[\s,.-]+/))
    .filter((x) => x.length >= 3);

  const uniqueLocations = [...new Set(locationsFromData)];

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
    text.match(/(\d+)\s*(eur|eura|€|eth)/i);

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

function getSearchableText(listing) {
  return normalizeText(
    [
      listing.title,
      listing.location,
      listing.locationTitle,
      listing.locationDescription,
      listing.summary,
      listing.descriptionShort,
      listing.descriptionLong,
      listing.propertyType,
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
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function calculateRuleSearchScore(listing, filters) {
  let score = 0;
  const reasons = [];

  const searchableText = getSearchableText(listing);
  const locationText = normalizeText(
    `${listing.location || ""} ${listing.locationTitle || ""} ${listing.locationDescription || ""}`,
  );

  if (filters.location && locationText.includes(filters.location)) {
    score += 20;
    reasons.push(`Location matches ${filters.location}`);
  }

  if (
    filters.guestCount &&
    Number(listing.guestCount || 0) >= filters.guestCount
  ) {
    score += 15;
    reasons.push(`Suitable for ${filters.guestCount} guests`);
  }

  const price = Number(listing.pricePerNight || listing.price || 0);

  if (filters.maxPrice && price > 0 && price <= filters.maxPrice) {
    score += 15;
    reasons.push("Price is within the requested budget");
  }

  if (
    filters.propertyType &&
    normalizeText(listing.propertyType || "").includes(filters.propertyType)
  ) {
    score += 15;
    reasons.push("Property type matches");
  }

  filters.amenities.forEach((amenity) => {
    const terms = getExpandedSearchTerms([normalizeText(amenity)]);

    if (terms.some((term) => searchableText.includes(term))) {
      score += 20;
      reasons.push(`Has ${amenity}`);
    }
  });

  filters.searchTerms.forEach((term) => {
    if (searchableText.includes(term)) {
      score += 5;
      reasons.push(`Matches "${term}"`);
    }
  });

  return {
    score: Math.min(score, 80),
    reasons: [...new Set(reasons)],
  };
}

function mapListingForSearch(
  listing,
  score,
  semanticScore,
  ruleScore,
  reasons,
) {
  return {
    listingId: Number(listing.listingId),
    title: listing.title || `Listing #${listing.listingId}`,
    summary: listing.summary || "",
    location: listing.location || "",
    locationTitle: listing.locationTitle || listing.location || "",
    locationDescription: listing.locationDescription || "",
    propertyType: listing.propertyType || "",
    guestCount: listing.guestCount || null,
    bedrooms: listing.bedrooms || null,
    beds: listing.beds || null,
    bathrooms: listing.bathrooms || null,
    pricePerNight: listing.pricePerNight || listing.price || null,
    amenities: listing.amenities || [],
    sleepingArrangements: listing.sleepingArrangements || [],
    imageUrls: listing.imageUrls || [],
    imageUrl: listing.imageUrl || listing.imageUrls?.[0] || "",
    coverImage: listing.coverImage || "",
    score,
    semanticScore,
    ruleScore,
    reasons,
  };
}

function listingHasAmenity(listing, amenity) {
  const searchableText = getSearchableText(listing);
  const terms = getExpandedSearchTerms([normalizeText(amenity)]);

  return terms.some((term) => searchableText.includes(term));
}

function hasHardMismatch(listing, filters) {
  // Ako korisnik traži 6 guests, listing s 2 ili 4 gosta ne smije proći
  if (
    filters.guestCount &&
    Number(listing.guestCount || 0) < filters.guestCount
  ) {
    return true;
  }

  // Ako korisnik traži house, apartmani ne smiju proći
  if (filters.propertyType) {
    const listingType = normalizeText(listing.propertyType || "");

    if (
      filters.propertyType === "house" &&
      !listingType.includes("house") &&
      !listingType.includes("villa") &&
      !listingType.includes("cabin")
    ) {
      return true;
    }

    if (
      filters.propertyType === "apartment" &&
      !listingType.includes("apartment") &&
      !listingType.includes("studio")
    ) {
      return true;
    }
  }

  // Ako korisnik eksplicitno traži pool/parking itd., listing to mora imati
  if (filters.amenities.length) {
    const missingAmenity = filters.amenities.some(
      (amenity) => !listingHasAmenity(listing, amenity),
    );

    if (missingAmenity) {
      return true;
    }
  }

  return false;
}

async function semanticListingSearch(message, filters) {
  const listings = mergeListings();

  await syncListingEmbeddings(listings);

  const embeddings = readEmbeddings();
  const queryEmbedding = await createEmbedding(message);

  return listings
    .filter((listing) => listing.isActive !== false)
    .filter((listing) => !hasHardMismatch(listing, filters))
    .map((listing) => {
      const listingEmbedding = embeddings.find(
        (item) => Number(item.listingId) === Number(listing.listingId),
      );

      const rawSemantic =
        queryEmbedding && listingEmbedding?.embedding
          ? cosineSimilarity(queryEmbedding, listingEmbedding.embedding)
          : 0;

      const semanticScore = Math.round(Math.max(0, rawSemantic) * 100);
      const ruleResult = calculateRuleSearchScore(listing, filters);
      const ruleScore = ruleResult.score;

      const finalScore = Math.min(
        Math.round(semanticScore * 0.45 + ruleScore * 0.55),
        99,
      );

      const reasons = [
        semanticScore > 70 ? "AI semantic match" : null,
        ...ruleResult.reasons,
      ].filter(Boolean);

      return mapListingForSearch(
        listing,
        finalScore,
        semanticScore,
        ruleScore,
        reasons.length ? reasons : ["AI semantic result"],
      );
    })
    .filter((item) => item.score >= 35)
    .sort((a, b) => b.score - a.score);
}

async function aiSearchListings(message) {
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
        "I can semantically search all listings using AI embeddings. Try: “Find a cozy apartment in Pula with kitchen, TV and air conditioning” or “Show me a pet-friendly stay with workspace”.",
      filters: null,
      results: [],
    };
  }

  if (intent === "platform_question") {
    return {
      message,
      intent,
      answer:
        "mStay uses MetaMask for wallet login and smart contract escrow. When a guest books a stay, payment is locked in the smart contract and released to the host after completion.",
      filters: null,
      results: [],
    };
  }

  const filters = extractFiltersFromMessage(message);
  const results = await semanticListingSearch(message, filters);

  return {
    message,
    intent,
    answer:
      results.length > 0
        ? `I found AI-matched stay${results.length === 1 ? "" : "s"} for you.`
        : "I could not find a matching stay. Try changing the location, number of guests, budget or amenities.",
    filters,
    results: results.slice(0, 6),
    debug: {
      aiEnabled: Boolean(process.env.OPENAI_API_KEY),
      searchMode: "semantic_embeddings",
    },
  };
}

export { aiSearchListings, extractFiltersFromMessage };
