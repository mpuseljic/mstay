<script setup>
const props = defineProps({
  review: {
    type: Object,
    required: true,
  },
})

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function stars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}
</script>

<template>
  <article class="review-card">
    <div class="review-top">
      <div>
        <strong>{{ stars(review.rating) }}</strong>
        <p>Ocjena: {{ review.rating }}/5</p>
      </div>

      <span class="review-date">{{ review.createdAt }}</span>
    </div>

    <div v-if="review.reviewHash" class="review-verified">On-chain verified review</div>

    <p class="review-comment">{{ review.comment }}</p>

    <div class="review-meta">
      <span>Autor: {{ shortenAddress(review.reviewer) }}</span>
    </div>
  </article>
</template>

<style scoped>
.review-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 18px;
  box-shadow: var(--shadow);
}

.review-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  margin-bottom: 12px;
}

.review-top strong {
  font-size: 1.1rem;
  color: #f59e0b;
}

.review-top p {
  margin: 6px 0 0;
  color: #4b5563;
}

.review-verified {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  background: #ecfdf3;
  color: #166534;
  border: 1px solid #bbf7d0;
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.review-date {
  color: var(--muted);
  font-size: 0.9rem;
}

.review-comment {
  margin: 0 0 12px;
  color: #374151;
  line-height: 1.7;
}

.review-meta {
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
