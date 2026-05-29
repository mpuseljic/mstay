<template>
  <section class="recommendations">
    <div class="recommendations__top">
      <div>
        <span class="section-kicker">AI powered</span>
        <h2>Recommended for you</h2>
        <p>
          Personalized stays based on your reservations, preferred locations, capacity and
          amenities.
        </p>
      </div>

      <RouterLink to="/listings" class="view-all">View all stays</RouterLink>
    </div>

    <div v-if="loading" class="recommendation-grid">
      <div v-for="i in 4" :key="i" class="stay-card skeleton"></div>
    </div>

    <p v-else-if="error" class="error">{{ error }}</p>

    <div v-else-if="recommendations.length" class="recommendation-grid">
      <article v-for="listing in recommendations" :key="listing.listingId" class="stay-card">
        <RouterLink :to="`/listings/${listing.listingId}`" class="image-wrap">
          <img :src="getListingImage(listing)" :alt="listing.title" />

          <span class="match-badge"> {{ listing.score }}% match </span>

          <button type="button" class="heart-btn">♡</button>
        </RouterLink>

        <div class="card-body">
          <div class="title-row">
            <h3>{{ listing.title }}</h3>
            <span class="rating">★ New</span>
          </div>

          <p class="location">
            {{ listing.locationTitle || 'Location available in details' }}
          </p>

          <p class="meta">
            {{ listing.propertyType || 'Stay' }}
            <template v-if="listing.guestCount"> · {{ listing.guestCount }} guests</template>
            <template v-if="listing.bedrooms"> · {{ listing.bedrooms }} bedrooms</template>
            <template v-if="listing.beds"> · {{ listing.beds }} beds</template>
          </p>

          <div v-if="listing.amenities?.length" class="amenities">
            <span v-for="amenity in listing.amenities.slice(0, 3)" :key="amenity">
              {{ amenity }}
            </span>
          </div>

          <p v-if="listing.reasons?.length" class="reason">
            {{ listing.reasons[0] }}
          </p>

          <RouterLink :to="`/listings/${listing.listingId}`" class="details-link">
            View details
          </RouterLink>
        </div>
      </article>
    </div>

    <div v-else class="empty-box">
      <h3>No recommendations yet</h3>
      <p>Recommendations will appear after you create more listings or complete reservations.</p>
      <RouterLink to="/listings" class="empty-link">Explore listings</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchRecommendations } from '@/services/ai'

const props = defineProps({
  walletAddress: {
    type: String,
    required: true,
  },
})

const loading = ref(false)
const error = ref('')
const recommendations = ref([])

function getListingImage(listing) {
  const roomImage = listing.sleepingArrangements?.find((x) => x.imageUrl)?.imageUrl

  return (
    roomImage ||
    listing.coverImage ||
    listing.imageUrl ||
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'
  )
}

async function loadRecommendations() {
  if (!props.walletAddress) return

  loading.value = true
  error.value = ''

  try {
    const response = await fetchRecommendations(props.walletAddress)
    recommendations.value = response.recommendations || []
  } catch (err) {
    error.value = 'Recommendations are currently unavailable.'
  } finally {
    loading.value = false
  }
}

onMounted(loadRecommendations)

watch(
  () => props.walletAddress,
  () => loadRecommendations(),
)
</script>

<style scoped>
.recommendations {
  margin: 54px 0;
}

.recommendations__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 24px;
}

.section-kicker {
  display: inline-flex;
  margin-bottom: 8px;
  color: var(--primary, #ff385c);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.recommendations h2 {
  margin: 0;
  color: #111827;
  font-size: clamp(1.7rem, 3vw, 2.35rem);
  letter-spacing: -0.04em;
}

.recommendations p {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.6;
}

.view-all {
  color: #111827;
  text-decoration: none;
  font-weight: 800;
  border-bottom: 2px solid #111827;
  white-space: nowrap;
}

.recommendation-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

.stay-card {
  min-width: 0;
}

.image-wrap {
  position: relative;
  display: block;
  aspect-ratio: 1 / 0.92;
  border-radius: 24px;
  overflow: hidden;
  background: #f3f4f6;
  text-decoration: none;
}

.image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.stay-card:hover img {
  transform: scale(1.045);
}

.match-badge {
  position: absolute;
  left: 14px;
  bottom: 14px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  color: #111827;
  font-size: 0.82rem;
  font-weight: 900;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.heart-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #111827;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.card-body {
  padding-top: 13px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.title-row h3 {
  margin: 0;
  color: #111827;
  font-size: 1rem;
  font-weight: 850;
  line-height: 1.35;
}

.rating {
  color: #111827;
  font-size: 0.9rem;
  white-space: nowrap;
}

.location,
.meta {
  margin-top: 4px !important;
  color: #717171 !important;
  font-size: 0.94rem;
}

.amenities {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 11px;
}

.amenities span {
  padding: 6px 9px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 0.78rem;
  font-weight: 750;
}

.reason {
  margin-top: 11px !important;
  color: #111827 !important;
  font-size: 0.9rem;
  font-weight: 700;
}

.details-link {
  display: inline-flex;
  margin-top: 10px;
  color: var(--primary, #ff385c);
  font-weight: 850;
  text-decoration: none;
}

.error {
  color: #dc2626;
  font-weight: 750;
}

.empty-box {
  border: 1px dashed #d1d5db;
  border-radius: 24px;
  padding: 28px;
  background: #fafafa;
}

.empty-box h3 {
  margin: 0;
  color: #111827;
}

.empty-link {
  display: inline-flex;
  margin-top: 14px;
  color: var(--primary, #ff385c);
  font-weight: 850;
  text-decoration: none;
}

.skeleton {
  height: 340px;
  border-radius: 24px;
  background: linear-gradient(90deg, #f3f4f6, #e5e7eb, #f3f4f6);
  background-size: 200% 100%;
  animation: shimmer 1.1s infinite linear;
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -200% 0;
  }
}

@media (max-width: 1150px) {
  .recommendation-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 850px) {
  .recommendations__top {
    align-items: flex-start;
    flex-direction: column;
  }

  .recommendation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .recommendation-grid {
    grid-template-columns: 1fr;
  }
}
</style>
