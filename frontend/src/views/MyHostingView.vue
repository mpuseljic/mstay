<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import ReservationCard from '../components/reservations/ReservationCard.vue'
import { useMstay } from '../composables/useMstay'
import EditListingDetailsModal from '@/components/hosting/EditListingDetailsModal.vue'
import { fetchHostAnalytics } from '@/services/analytics'

const {
  walletAddress,
  listings,
  hostReservations,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadListings,
  loadHostReservations,
  cancelReservationByHost,
  releasePayout,
  leaveReview,
  hasHostLeftReview,
} = useMstay()

const reviewForm = ref({
  reservationId: '',
  rating: 5,
  comment: '',
})

const reviewMessage = ref('')
const reviewError = ref('')
const hostReviewStatus = ref({})
const hostReviewStatusLoading = ref(false)
const selectedListingForEdit = ref(null)
const isEditDetailsOpen = ref(false)
const hostAnalytics = ref(null)
const analyticsLoading = ref(false)
const analyticsError = ref('')

const myListings = computed(() => {
  if (!walletAddress.value) return []

  return listings.value.filter(
    (listing) => listing.host?.toLowerCase() === walletAddress.value.toLowerCase(),
  )
})

const hostingListingStats = computed(() => {
  const breakdownMap = new Map(
    (hostAnalytics.value?.listingsBreakdown || []).map((item) => [String(item.listingId), item]),
  )

  return myListings.value.map((listing) => {
    const stats = breakdownMap.get(String(listing.id))

    return {
      ...listing,
      reservationsCount: stats?.reservationsCount || 0,
      activeReservationsCount: stats?.activeCount || 0,
      earned: stats?.earnedEth || 0,
      pending: stats?.pendingEth || 0,
      completedCount: stats?.completedCount || 0,
      cancelledCount: stats?.cancelledCount || 0,
    }
  })
})

const totalListingsCount = computed(() => myListings.value.length)
const totalReservationsCount = computed(() => hostReservations.value.length)

const totalEarned = computed(() => {
  return hostReservations.value
    .filter((reservation) => reservation.status === '3')
    .reduce((sum, reservation) => sum + Number(reservation.totalPrice || 0), 0)
})

const pendingEarnings = computed(() => {
  return hostReservations.value
    .filter((reservation) => reservation.status === '0')
    .reduce((sum, reservation) => sum + Number(reservation.totalPrice || 0), 0)
})

const activeHostingReservations = computed(() => {
  return hostReservations.value.filter((reservation) => reservation.status === '0').length
})

const closedHostingReservations = computed(() => {
  return hostReservations.value.filter((reservation) =>
    ['1', '2', '3', '4'].includes(reservation.status),
  ).length
})

function openListingDetailsEditor(listing) {
  selectedListingForEdit.value = listing
  isEditDetailsOpen.value = true
}

async function handleListingDetailsSaved() {
  isEditDetailsOpen.value = false
  await loadListings()
  await loadHostAnalytics()
}

function canReviewReservation(reservation) {
  if (hostReviewStatusLoading.value) return false
  const now = Math.floor(Date.now() / 1000)
  const alreadyReviewed = hostReviewStatus.value[reservation.id] === true
  return now >= reservation.checkOutTimestamp && !alreadyReviewed
}

async function handleHostCancel(id) {
  await cancelReservationByHost(Number(id))
  await loadHostReservations()
  await loadHostReviewStatuses()
  await loadHostAnalytics()
}

async function handleHostPayout(id) {
  await releasePayout(Number(id))
  await loadHostReservations()
  await loadHostAnalytics()
}

function openHostReviewForm(reservationId) {
  reviewForm.value = {
    reservationId,
    rating: 5,
    comment: '',
  }
  reviewMessage.value = ''
  reviewError.value = ''
}

async function handleHostReview() {
  try {
    reviewError.value = ''
    reviewMessage.value = ''

    await leaveReview(
      Number(reviewForm.value.reservationId),
      Number(reviewForm.value.rating),
      reviewForm.value.comment,
      false,
    )

    reviewMessage.value = 'Recenzija za gosta je uspješno spremljena.'
    hostReviewStatus.value[reviewForm.value.reservationId] = true

    reviewForm.value = {
      reservationId: '',
      rating: 5,
      comment: '',
    }

    await loadHostReservations()
    await loadHostAnalytics()
  } catch (err) {
    reviewError.value = err.message || 'Greška pri spremanju recenzije.'
  }
}

async function loadHostReviewStatuses() {
  hostReviewStatusLoading.value = true

  try {
    const entries = await Promise.all(
      hostReservations.value.map(async (reservation) => {
        try {
          const alreadyLeft = await hasHostLeftReview(Number(reservation.id))
          return [reservation.id, alreadyLeft]
        } catch {
          return [reservation.id, false]
        }
      }),
    )

    hostReviewStatus.value = Object.fromEntries(entries)
  } finally {
    hostReviewStatusLoading.value = false
  }
}

async function loadHostAnalytics() {
  if (!walletAddress.value) {
    hostAnalytics.value = null
    return
  }

  try {
    analyticsLoading.value = true
    analyticsError.value = ''
    hostAnalytics.value = await fetchHostAnalytics(walletAddress.value)
  } catch (err) {
    analyticsError.value = err.message || 'Greška kod dohvaćanja analitike.'
    hostAnalytics.value = null
  } finally {
    analyticsLoading.value = false
  }
}

watch(
  () => walletAddress.value,
  async (newWallet) => {
    if (!newWallet) {
      hostReservations.value = []
      hostReviewStatus.value = {}
      hostReviewStatusLoading.value = false
      hostAnalytics.value = null
      return
    }

    await loadListings()
    await loadHostReservations()
    await loadHostReviewStatuses()
    await loadHostAnalytics()
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <section class="hero">
        <div class="hero__copy">
          <span class="eyebrow">Host dashboard</span>
          <h1>My Hosting</h1>
          <p>
            Manage reservations for your listings, cancellations, escrow payouts, and review guests
            after their stay.
          </p>
        </div>

        <div class="hero__stats" v-if="hostAnalytics">
          <div class="stat-card">
            <span class="stat-label">My listings</span>
            <strong class="stat-value">{{ hostAnalytics.totalListings }}</strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Total reservations</span>
            <strong class="stat-value">{{ hostAnalytics.totalReservations }}</strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Total earned</span>
            <strong class="stat-value">{{ hostAnalytics.totalEarnedEth.toFixed(4) }} ETH</strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Pending</span>
            <strong class="stat-value">{{ hostAnalytics.pendingAmountEth.toFixed(4) }} ETH</strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Active reservations</span>
            <strong class="stat-value">{{ hostAnalytics.activeReservations }}</strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Rating</span>
            <strong class="stat-value">
              {{
                hostAnalytics.totalReviewsReceived
                  ? `${hostAnalytics.averageRating.toFixed(1)} ★`
                  : '—'
              }}
            </strong>
          </div>
        </div>
      </section>

      <section v-if="successMsg" class="alert alert--success">
        {{ successMsg }}
      </section>

      <section v-if="errorMsg" class="alert alert--error">
        {{ errorMsg }}
      </section>

      <section class="section-head">
        <div>
          <h2>My listings</h2>
          <p>Overview of all listings you have published as a host.</p>
        </div>

        <RouterLink to="/create-listing" class="explore-btn"> Add new listing </RouterLink>
      </section>

      <section v-if="hostingListingStats.length === 0" class="empty-state empty-state--compact">
        <div class="empty-state__icon">🏡</div>
        <h3>You don’t have any listings yet</h3>
        <p>Create your first property to start receiving bookings and reviews.</p>
        <RouterLink to="/create-listing" class="primary-link-btn">
          Create your first listing
        </RouterLink>
      </section>

      <section v-else class="host-listing-grid">
        <article v-for="listing in hostingListingStats" :key="listing.id" class="host-listing-card">
          <div class="host-listing-card__image">
            <img
              v-if="listing.imageUrl"
              :src="listing.imageUrl"
              :alt="listing.title"
              class="host-listing-card__img"
            />
            <div v-else class="host-listing-card__placeholder">
              <span>mStay</span>
            </div>
          </div>

          <div class="host-listing-card__body">
            <div class="host-listing-card__top">
              <div>
                <h3>{{ listing.title }}</h3>
                <p>{{ listing.location }}</p>
              </div>

              <span :class="['badge', listing.isActive ? 'badge--success' : 'badge--muted']">
                {{ listing.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <div class="host-rating-row" v-if="listing.totalReviews > 0">
              <span class="host-rating-row__star">★</span>
              <strong>{{ listing.averageRating.toFixed(1) }}</strong>
              <span>{{ listing.totalReviews }} reviews</span>
            </div>

            <div class="host-rating-row host-rating-row--muted" v-else>
              <span>No reviews yet</span>
            </div>

            <div class="host-listing-stats">
              <div class="host-listing-stat">
                <span>Price / night</span>
                <strong>{{ listing.pricePerNight }} ETH</strong>
              </div>

              <div class="host-listing-stat">
                <span>Total reservations</span>
                <strong>{{ listing.reservationsCount }}</strong>
              </div>

              <div class="host-listing-stat">
                <span>Active reservations</span>
                <strong>{{ listing.activeReservationsCount }}</strong>
              </div>

              <div class="host-listing-stat">
                <span>Earned</span>
                <strong>{{ listing.earned.toFixed(2) }} ETH</strong>
              </div>

              <div class="host-listing-stat">
                <span>Pending</span>
                <strong>{{ listing.pending.toFixed(2) }} ETH</strong>
              </div>

              <div class="host-listing-stat">
                <span>Rating</span>
                <strong>
                  {{ listing.totalReviews > 0 ? `${listing.averageRating.toFixed(1)} ★` : '—' }}
                </strong>
              </div>
            </div>

            <RouterLink :to="`/listings/${listing.id}`" class="host-listing-link">
              View listing
            </RouterLink>

            <button class="host-listing-edit-btn" @click="openListingDetailsEditor(listing)">
              Edit listing details
            </button>
          </div>
        </article>
      </section>

      <section class="section-head">
        <div>
          <h2>Reservations for your stays</h2>
          <p>Overview of all bookings made by guests for your listings.</p>
        </div>
      </section>

      <section v-if="hostReservations.length === 0" class="empty-state">
        <div class="empty-state__icon">🏠</div>
        <h3>No reservations yet</h3>
        <p>
          When a guest books your listing, you will see all details here, including reservation
          status, cancellation options, payouts, and reviews.
        </p>
      </section>

      <section v-else class="reservation-grid">
        <ReservationCard
          v-for="reservation in hostReservations"
          :key="reservation.id"
          :reservation="reservation"
          mode="host"
          :can-review="canReviewReservation(reservation)"
          :reviewed-label="hostReviewStatus[reservation.id] ? 'Guest reviewed' : ''"
          @host-cancel="handleHostCancel"
          @host-payout="handleHostPayout"
          @host-review="openHostReviewForm"
        />
      </section>

      <section v-if="reviewForm.reservationId" class="review-panel">
        <h3>Review guest</h3>

        <div v-if="reviewError" class="alert alert--error">
          {{ reviewError }}
        </div>

        <div v-if="reviewMessage" class="alert alert--success">
          {{ reviewMessage }}
        </div>

        <div class="review-grid">
          <div class="form-group">
            <label>Rating</label>
            <select v-model="reviewForm.rating">
              <option :value="5">5</option>
              <option :value="4">4</option>
              <option :value="3">3</option>
              <option :value="2">2</option>
              <option :value="1">1</option>
            </select>
          </div>

          <div class="form-group form-group--full">
            <label>Comment</label>
            <textarea
              v-model="reviewForm.comment"
              rows="4"
              placeholder="Write a short review about the guest..."
            ></textarea>
          </div>
        </div>

        <button class="primary-link-btn" @click="handleHostReview">Submit review</button>
      </section>

      <EditListingDetailsModal
        :open="isEditDetailsOpen"
        :listing="selectedListingForEdit"
        @close="isEditDetailsOpen = false"
        @saved="handleListingDetailsSaved"
      ></EditListingDetailsModal>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr;
  gap: 22px;
  background: linear-gradient(135deg, #ffffff, #f9fafb);
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: var(--shadow);
}

.eyebrow {
  display: inline-block;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.82rem;
  font-weight: 700;
}

.hero__copy h1 {
  margin: 0 0 10px;
  font-size: 2.4rem;
}

.hero__copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
  max-width: 680px;
}

.hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.04);
}

.stat-label {
  display: block;
  font-size: 0.88rem;
  color: var(--muted);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-head h2 {
  margin: 0 0 6px;
}

.section-head p {
  margin: 0;
  color: var(--muted);
}

.explore-btn,
.primary-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  padding: 13px 18px;
  font-weight: 700;
  text-decoration: none;
}

.explore-btn {
  background: white;
  border: 1px solid var(--border);
  color: var(--text);
}

.primary-link-btn {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  border: 0;
  cursor: pointer;
}

.reservation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.empty-state,
.review-panel {
  background: white;
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 44px 28px;
  box-shadow: var(--shadow);
}

.empty-state {
  text-align: center;
}

.empty-state__icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff1f3;
  font-size: 1.8rem;
}

.empty-state h3 {
  margin: 0 0 10px;
  font-size: 1.4rem;
}

.empty-state p {
  max-width: 560px;
  margin: 0 auto 20px;
  color: var(--muted);
  line-height: 1.7;
}

.review-panel {
  margin-top: 28px;
  padding: 24px;
}

.review-panel h3 {
  margin: 0 0 16px;
}

.review-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

select,
textarea {
  border: 1px solid #dddddd;
  border-radius: 16px;
  padding: 14px 16px;
  font: inherit;
}

.alert {
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 18px;
  font-weight: 600;
}

.alert--success {
  background: #ecfdf3;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.alert--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.host-listing-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}

.host-listing-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.host-listing-card__image {
  height: 220px;
  background: #f3f4f6;
}

.host-listing-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.host-listing-card__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(255, 56, 92, 0.16), rgba(255, 56, 92, 0.04)),
    linear-gradient(135deg, #f9fafb, #f3f4f6);
  font-weight: 800;
  color: #374151;
}

.host-listing-card__body {
  padding: 20px;
}

.host-listing-card__top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 14px;
  margin-bottom: 12px;
}

.host-listing-card__top h3 {
  margin: 0 0 6px;
  font-size: 1.08rem;
}

.host-listing-card__top p {
  margin: 0;
  color: var(--muted);
}

.host-rating-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
  color: #374151;
}

.host-rating-row--muted {
  color: var(--muted);
}

.host-rating-row__star {
  color: #f59e0b;
}

.host-listing-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.host-listing-stat {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 14px;
}

.host-listing-stat span {
  display: block;
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.host-listing-stat strong {
  font-size: 1rem;
}

.host-listing-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  padding: 12px 16px;
  background: #111827;
  color: white;
  font-weight: 700;
  text-decoration: none;
}

.host-listing-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  padding: 12px 16px;
  background: #f3f4f6;
  color: #111827;
  font-weight: 700;
  border: 0;
  cursor: pointer;
  margin-left: 10px;
}

.empty-state--compact {
  margin-bottom: 28px;
}

@media (max-width: 1100px) {
  .hero,
  .reservation-grid,
  .host-listing-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: start;
  }

  .hero__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .page {
    padding: 24px 14px 42px;
  }

  .hero {
    padding: 24px;
  }

  .hero__copy h1 {
    font-size: 2rem;
  }

  .hero__stats,
  .host-listing-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .hero,
  .reservation-grid,
  .host-listing-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: start;
  }
}

@media (max-width: 700px) {
  .host-listing-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .hero,
  .reservation-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: start;
  }
}

@media (max-width: 700px) {
  .page {
    padding: 24px 14px 42px;
  }

  .hero {
    padding: 24px;
  }

  .hero__copy h1 {
    font-size: 2rem;
  }

  .hero__stats {
    grid-template-columns: 1fr;
  }
}
</style>
