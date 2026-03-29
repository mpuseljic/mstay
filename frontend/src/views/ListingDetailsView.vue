<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import { useMstay } from '../composables/useMstay'
import AppFooter from '@/components/layout/AppFooter.vue'
import ReviewCard from '@/components/reviews/ReviewCard.vue'

const route = useRoute()

const {
  walletAddress,
  listings,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadListings,
  makeReservation,
  calculateReservationPrice,
  checkDateAvailability,
  loadReviewsForUser,
} = useMstay()

const listing = ref(null)
const activeImage = ref('')
const isLightboxOpen = ref(false)
const activeImageIndex = ref(0)
const isBooking = ref(false)
const reservationPricePreview = ref('0')
const bookingError = ref('')
const bookingSuccess = ref('')
const reviews = ref([])

const reservationForm = ref({
  checkIn: '',
  checkOut: '',
})

const reservationNights = computed(() => {
  if (!reservationForm.value.checkIn || !reservationForm.value.checkOut) return 0

  const checkIn = new Date(reservationForm.value.checkIn)
  const checkOut = new Date(reservationForm.value.checkOut)
  const diffMs = checkOut.getTime() - checkIn.getTime()

  if (diffMs <= 0) return 0

  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
})

const isOwnListing = computed(() => {
  if (!walletAddress.value || !listing.value) return false
  return listing.value.host.toLowerCase() === walletAddress.value.toLowerCase()
})

const allImages = computed(() => {
  return listing.value?.imageUrls || []
})

const mainImage = computed(() => {
  return allImages.value[activeImageIndex.value] || ''
})

const galleryImages = computed(() => {
  return allImages.value
    .map((img, index) => ({ img, index }))
    .filter((item) => item.index !== activeImageIndex.value)
})

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function toUnixTimestamp(dateString) {
  return Math.floor(new Date(dateString).getTime() / 1000)
}

function fromWei(value) {
  return (Number(value) / 1e18).toString()
}

async function loadCurrentListing() {
  await loadListings()

  listing.value = listings.value.find((item) => item.id === String(route.params.id)) || null

  if (listing.value?.host) {
    reviews.value = await loadReviewsForUser(listing.value.host)
  }
}

async function updateReservationPreview() {
  try {
    if (!listing.value || !reservationForm.value.checkIn || !reservationForm.value.checkOut) {
      reservationPricePreview.value = '0'
      return
    }

    const checkInTs = toUnixTimestamp(reservationForm.value.checkIn)
    const checkOutTs = toUnixTimestamp(reservationForm.value.checkOut)

    const [, totalPriceWei] = await calculateReservationPrice(
      Number(listing.value.id),
      checkInTs,
      checkOutTs,
    )

    reservationPricePreview.value = fromWei(totalPriceWei)
  } catch {
    reservationPricePreview.value = '0'
  }
}

async function handleReservation() {
  if (!walletAddress.value || !listing.value) return

  bookingError.value = ''
  bookingSuccess.value = ''

  const checkInTs = toUnixTimestamp(reservationForm.value.checkIn)
  const checkOutTs = toUnixTimestamp(reservationForm.value.checkOut)

  try {
    isBooking.value = true

    const isAvailable = await checkDateAvailability(Number(listing.value.id), checkInTs, checkOutTs)

    if (!isAvailable) {
      bookingError.value = 'Odabrani datumi nisu dostupni za ovaj smještaj. Odaberi drugi termin.'
      bookingSuccess.value = ''
      return
    }

    await makeReservation(Number(listing.value.id), checkInTs, checkOutTs)

    bookingSuccess.value = 'Rezervacija je uspješno kreirana.'
    bookingError.value = ''

    reservationForm.value.checkIn = ''
    reservationForm.value.checkOut = ''
    reservationPricePreview.value = '0'
  } finally {
    isBooking.value = false
  }
}

function setActiveImage(image) {
  activeImage.value = image
}

function setActiveImageByIndex(index) {
  activeImageIndex.value = index
}

function openLightbox(index = activeImageIndex.value) {
  activeImageIndex.value = index
  isLightboxOpen.value = true
}

function closeLightbox() {
  isLightboxOpen.value = false
}

function showPrevImage() {
  if (!allImages.value.length) return
  activeImageIndex.value =
    (activeImageIndex.value - 1 + allImages.value.length) % allImages.value.length
}

function showNextImage() {
  if (!allImages.value.length) return
  activeImageIndex.value = (activeImageIndex.value + 1) % allImages.value.length
}

function handleKeydown(event) {
  if (!isLightboxOpen.value) return

  if (event.key === 'Escape') {
    closeLightbox()
  } else if (event.key === 'ArrowLeft') {
    showPrevImage()
  } else if (event.key === 'ArrowRight') {
    showNextImage()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(
  () => listing.value,
  (newListing) => {
    if (newListing?.imageUrls?.length) {
      activeImageIndex.value = 0
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await loadCurrentListing()
})
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page" v-if="listing">
      <section class="details-head">
        <div>
          <h1>{{ listing.title }}</h1>
          <p>{{ listing.location }}</p>
        </div>

        <div class="details-rating" v-if="listing.totalReviews > 0">
          <span class="details-rating__star">★</span>
          <strong>{{ listing.averageRating.toFixed(1) }}</strong>
          <span>{{ listing.totalReviews }} recenzija</span>
        </div>

        <div class="details-rating details-rating--muted" v-else>
          <span>Još nema recenzija</span>
        </div>

        <div class="head-badges">
          <span :class="['badge', listing.isActive ? 'badge--success' : 'badge--muted']">
            {{ listing.isActive ? 'Aktivan' : 'Neaktivan' }}
          </span>
          <span class="host-badge">Host: {{ shortenAddress(listing.host) }}</span>
        </div>
      </section>

      <section v-if="successMsg" class="alert alert--success">{{ successMsg }}</section>
      <section v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</section>

      <section class="gallery" v-if="listing.imageUrls?.length">
        <div class="gallery__main" @click="openLightbox(activeImageIndex)">
          <img v-if="mainImage" :src="mainImage" :alt="listing.title" class="gallery__img" />
          <div v-else class="gallery__main-placeholder">
            <span class="gallery__label">mStay Stay</span>
          </div>

          <div v-if="mainImage" class="gallery__main-badge">Glavna fotografija</div>
        </div>

        <div class="gallery__side" v-if="galleryImages.length">
          <button
            v-for="item in galleryImages"
            :key="item.index"
            class="gallery__mini"
            type="button"
            @click="setActiveImageByIndex(item.index)"
          >
            <img
              :src="item.img"
              :alt="`${listing.title} ${item.index + 1}`"
              class="gallery__mini-img"
            />
          </button>
        </div>
      </section>

      <section class="gallery" v-else>
        <div class="gallery__main">
          <div class="gallery__main-placeholder">
            <span class="gallery__label">mStay Stay</span>
          </div>
        </div>
      </section>

      <div v-if="isLightboxOpen" class="lightbox" @click.self="closeLightbox">
        <button class="lightbox__close" @click="closeLightbox">✕</button>

        <button
          v-if="allImages.length > 1"
          class="lightbox__nav lightbox__nav--left"
          @click.stop="showPrevImage"
        >
          ‹
        </button>

        <div class="lightbox__content">
          <img :src="mainImage" :alt="listing.title" class="lightbox__image" />

          <div class="lightbox__counter">{{ activeImageIndex + 1 }} / {{ allImages.length }}</div>
        </div>

        <button
          v-if="allImages.length > 1"
          class="lightbox__nav lightbox__nav--right"
          @click.stop="showNextImage"
        >
          ›
        </button>
      </div>

      <section class="details-layout">
        <div class="details-content">
          <div class="content-card">
            <h2>About this stay</h2>
            <p>
              Ovaj smještaj je objavljen na mStay platformi i može se rezervirati kroz escrow model
              plaćanja putem blockchain transakcije.
            </p>

            <div class="info-grid">
              <div class="info-item">
                <span>ID oglasa</span>
                <strong>{{ listing.id }}</strong>
              </div>
              <div class="info-item">
                <span>Lokacija</span>
                <strong>{{ listing.location }}</strong>
              </div>
              <div class="info-item">
                <span>Cijena po noći</span>
                <strong>{{ listing.pricePerNight }} ETH</strong>
              </div>
              <div class="info-item">
                <span>Status</span>
                <strong>{{ listing.isActive ? 'Aktivan' : 'Neaktivan' }}</strong>
              </div>
            </div>
          </div>

          <div class="content-card">
            <h2>What this place offers</h2>
            <div class="amenities">
              <div class="amenity">Self check-in</div>
              <div class="amenity">On-chain payment</div>
              <div class="amenity">Escrow protection</div>
              <div class="amenity">MetaMask booking</div>
            </div>
          </div>

          <div class="content-card">
            <h2>Guest reviews</h2>

            <p v-if="reviews.length === 0" class="reviews-intro">
              Ovaj domaćin još nema recenzija.
            </p>

            <div v-else class="review-placeholder-grid">
              <ReviewCard v-for="review in reviews" :key="review.id" :review="review" />
            </div>
          </div>
        </div>

        <aside class="booking-sidebar">
          <div class="booking-card">
            <div class="price-top">
              <strong>{{ listing.pricePerNight }} ETH</strong>
              <span>/ noć</span>
            </div>

            <div class="form-group">
              <label>Check-in</label>
              <input
                v-model="reservationForm.checkIn"
                type="date"
                @change="updateReservationPreview"
              />
            </div>

            <div class="form-group">
              <label>Check-out</label>
              <input
                v-model="reservationForm.checkOut"
                type="date"
                @change="updateReservationPreview"
              />
            </div>

            <div v-if="reservationNights > 0" class="preview">
              <div class="preview-row">
                <span>Noćenja</span>
                <strong>{{ reservationNights }}</strong>
              </div>
              <div class="preview-row">
                <span>Ukupna cijena</span>
                <strong>{{ reservationPricePreview }} ETH</strong>
              </div>
            </div>

            <div v-if="bookingError" class="booking-message booking-message--error">
              {{ bookingError }}
            </div>

            <div v-if="bookingSuccess" class="booking-message booking-message--success">
              {{ bookingSuccess }}
            </div>

            <button
              class="book-btn"
              @click="handleReservation"
              :disabled="isBooking || isOwnListing || !listing.isActive"
            >
              {{
                isOwnListing ? 'Vlastiti oglas' : isBooking ? 'Slanje transakcije...' : 'Rezerviraj'
              }}
            </button>

            <p class="booking-note">Sredstva se drže u escrowu do trenutka isplate domaćinu.</p>
          </div>
        </aside>
      </section>
    </main>

    <main class="page" v-else>
      <section class="empty-page">
        <h1>Oglas nije pronađen</h1>
        <p>Provjeri ID oglasa ili se vrati na popis svih oglasa.</p>
      </section>
      <AppFooter />
    </main>
  </div>
</template>

<style scoped>
.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.details-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 18px;
  margin-bottom: 22px;
}

.details-head h1 {
  margin: 0 0 6px;
  font-size: 2.4rem;
}

.details-head p {
  margin: 0;
  color: var(--muted);
  font-size: 1rem;
}

.head-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.host-badge,
.badge {
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 700;
}

.badge--success {
  background: #dcfce7;
  color: #166534;
}

.badge--muted {
  background: #f3f4f6;
  color: #6b7280;
}

.host-badge {
  background: white;
  border: 1px solid var(--border);
}

.gallery {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}

.gallery__main {
  min-height: 420px;
  border-radius: 24px;
  border: 1px solid var(--border);
  overflow: hidden;
  background: #f3f4f6;
}

.gallery__side {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-height: 420px;
  overflow: auto;
}

.gallery__mini {
  min-height: 120px;
  border-radius: 24px;
  border: 1px solid var(--border);
  overflow: hidden;
  background: #f3f4f6;
  padding: 0;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.gallery__mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(17, 24, 39, 0.08);
  border-color: #d1d5db;
}

.gallery__img,
.gallery__mini-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gallery__main-placeholder {
  width: 100%;
  height: 100%;
  background:
    linear-gradient(135deg, rgba(255, 56, 92, 0.16), rgba(255, 56, 92, 0.04)),
    linear-gradient(135deg, #f9fafb, #f3f4f6);
  display: flex;
  align-items: end;
  padding: 20px;
}

.gallery__label {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 700;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(17, 24, 39, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.lightbox__content {
  position: relative;
  max-width: 1100px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox__image {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.lightbox__close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: white;
  font-size: 1.3rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.lightbox__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: white;
  font-size: 2rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  z-index: 2;
}

.lightbox__nav--left {
  left: 24px;
}

.lightbox__nav--right {
  right: 24px;
}

.lightbox__counter {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(17, 24, 39, 0.68);
  color: white;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.88rem;
  font-weight: 700;
}

.details-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 26px;
}

.details-content {
  display: grid;
  gap: 20px;
}

.content-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.content-card h2 {
  margin: 0 0 14px;
}

.content-card p {
  margin: 0;
  color: #4b5563;
  line-height: 1.75;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.info-item {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
  padding: 16px;
}

.info-item span {
  display: block;
  color: var(--muted);
  margin-bottom: 8px;
}

.amenities {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.amenity {
  background: #fff7f8;
  border: 1px solid #ffd7df;
  border-radius: 16px;
  padding: 14px 16px;
  font-weight: 600;
}

.booking-sidebar {
  position: relative;
}

.booking-card {
  position: sticky;
  top: 100px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 22px;
  box-shadow: var(--shadow);
}

.price-top {
  display: flex;
  align-items: end;
  gap: 8px;
  margin-bottom: 18px;
}

.price-top strong {
  font-size: 1.8rem;
}

.price-top span {
  color: var(--muted);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.form-group label {
  font-weight: 700;
}

input {
  border: 1px solid #dddddd;
  border-radius: 16px;
  padding: 14px 16px;
}

.preview {
  background: #fff5f7;
  border: 1px solid #ffd7df;
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}

.book-btn {
  width: 100%;
  border: 0;
  border-radius: 16px;
  padding: 15px 16px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.book-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.booking-note {
  margin: 14px 0 0;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.6;
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

.empty-page {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 36px;
  text-align: center;
}

.empty-page h1 {
  margin: 0 0 8px;
}

.empty-page p {
  margin: 0;
  color: var(--muted);
}
.reviews-intro {
  margin-bottom: 16px !important;
}

.review-placeholder-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.review-placeholder {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
  padding: 16px;
}

.review-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.review-top strong {
  font-size: 1.05rem;
}

.review-top span {
  color: #374151;
  font-weight: 600;
}

.review-placeholder p {
  margin: 0;
  color: #4b5563;
  line-height: 1.65;
}

.booking-message {
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 14px;
  font-size: 0.94rem;
  font-weight: 600;
  line-height: 1.5;
}

.booking-message--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.booking-message--success {
  background: #ecfdf3;
  border: 1px solid #bbf7d0;
  color: #166534;
}

@media (max-width: 768px) {
  .details-head {
    flex-direction: column;
    align-items: start;
  }

  .details-head h1 {
    font-size: 2rem;
  }

  .info-grid,
  .amenities,
  .review-placeholder-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .gallery,
  .details-layout {
    grid-template-columns: 1fr;
  }

  .booking-card {
    position: static;
  }

  .gallery__side {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 768px) {
  .details-head {
    flex-direction: column;
    align-items: start;
  }

  .details-head h1 {
    font-size: 2rem;
  }

  .info-grid,
  .amenities,
  .review-placeholder-grid {
    grid-template-columns: 1fr;
  }

  .gallery__side {
    grid-template-columns: 1fr;
  }
}

.details-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  color: #374151;
}

.details-rating strong {
  font-size: 1rem;
}

.details-rating__star {
  color: #f59e0b;
}

.details-rating--muted {
  color: var(--muted);
}
</style>
