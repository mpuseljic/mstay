export function normalizeAddress(address) {
  return String(address || "").toLowerCase();
}

export function calculateAverageRating(reviews = [], walletAddress = "") {
  const normalizedWallet = normalizeAddress(walletAddress);

  const relevantReviews = reviews.filter(
    (review) => normalizeAddress(review.reviewedUser) === normalizedWallet,
  );

  if (!relevantReviews.length) {
    return {
      totalReviews: 0,
      averageRating: 0,
    };
  }

  const total = relevantReviews.reduce(
    (sum, review) => sum + Number(review.rating || 0),
    0,
  );

  return {
    totalReviews: relevantReviews.length,
    averageRating: total / relevantReviews.length,
  };
}

export function formatEthFromWei(value) {
  return Number(value || 0) / 1e18;
}
