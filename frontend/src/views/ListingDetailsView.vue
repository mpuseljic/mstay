<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { parseEther } from 'ethers'
import { useRoute } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import { useMstay } from '../composables/useMstay'
import AppFooter from '@/components/layout/AppFooter.vue'
import ReviewCard from '@/components/reviews/ReviewCard.vue'
import HostProfileCard from '@/components/profile/HostProfileCard.vue'
import { useProfile } from '@/composables/useProfile'
import { useListingDetails } from '@/composables/useListingDetails'
import ListingMapCard from '@/components/listings/ListingMapCard.vue'

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
  fetchReservationsByListing,
  tokenBalance,
  loadTokenBalance,
  approveDiscountTokens,
  makeReservationWithDiscount,
} = useMstay()

const { loadProfile } = useProfile()
const hostProfile = ref(null)
const { loadListingDetails } = useListingDetails()

const listing = ref(null)
const activeImage = ref('')
const isLightboxOpen = ref(false)
const activeImageIndex = ref(0)
const isBooking = ref(false)
const reservationPricePreview = ref('0')
const bookingError = ref('')
const bookingSuccess = ref('')
const reviews = ref([])
const listingContent = ref(null)
const isDescriptionModalOpen = ref(false)
const isAmenitiesModalOpen = ref(false)

const isCheckoutOpen = ref(false)

const isDiscountApproved = ref(false)
const useDiscountBooking = ref(false)
const discountTokenCost = 50
const discountPercent = 10

const reservationForm = ref({
  checkIn: '',
  checkOut: '',
})

const selectedRange = ref({
  start: null,
  end: null,
})

const listingReservations = ref([])
const isCalendarOpen = ref(false)

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

  if (listing.value?.id) {
    listingContent.value = await loadListingDetails(Number(listing.value.id))
  }

  if (listing.value?.host) {
    reviews.value = await loadReviewsForUser(listing.value.host)
    hostProfile.value = await loadProfile(listing.value.host)
    console.log('HOST PROFILE: ', hostProfile.value)
  }

  if (listing.value?.id) {
    const reservationData = await fetchReservationsByListing(Number(listing.value.id))
    listingReservations.value = reservationData.map((item) => ({
      id: item.id.toString(),
      listingId: item.listingId.toString(),
      guest: item.guest,
      checkInTimestamp: Number(item.checkInDate),
      checkOutTimestamp: Number(item.checkOutDate),
      status: item.status.toString(),
    }))
  }

  console.log('listingReservations', listingReservations.value)

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

function handleReservation() {
  if (!walletAddress.value || !listing.value) return
  if (!reservationForm.value.checkIn || !reservationForm.value.checkOut) return

  bookingError.value = ''
  bookingSuccess.value = ''
  isCheckoutOpen.value = true
}

async function confirmReservation() {
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
      isCheckoutOpen.value = false
      return
    }

    await makeReservation(Number(listing.value.id), checkInTs, checkOutTs)

    bookingSuccess.value = 'Rezervacija je uspješno kreirana.'
    bookingError.value = ''

    reservationForm.value.checkIn = ''
    reservationForm.value.checkOut = ''
    reservationPricePreview.value = '0'
    selectedRange.value = { start: null, end: null }
    isCheckoutOpen.value = false

    await loadCurrentListing()
  } finally {
    isBooking.value = false
  }
}

async function handleApproveDiscount() {
  try {
    bookingError.value = ''
    await approveDiscountTokens(parseEther(String(discountTokenCost)))
    isDiscountApproved.value = true
    await loadTokenBalance()
  } catch (err) {
    bookingError.value = err.message || 'Greška kod odobravanja tokena za popust.'
  }
}

async function confirmReservationWithDiscount() {
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
      isCheckoutOpen.value = false
      return
    }

    await makeReservationWithDiscount(Number(listing.value.id), checkInTs, checkOutTs)

    bookingSuccess.value = 'Rezervacija s loyalty popustom je uspješno kreirana.'
    bookingError.value = ''

    reservationForm.value.checkIn = ''
    reservationForm.value.checkOut = ''
    reservationPricePreview.value = '0'
    selectedRange.value = { start: null, end: null }
    isCheckoutOpen.value = false
    isDiscountApproved.value = false
    useDiscountBooking.value = false

    await Promise.all([loadCurrentListing(), loadTokenBalance()])
  } finally {
    isBooking.value = false
  }
}

const checkoutSummary = computed(() => {
  return {
    title: listing.value?.title || '',
    location: listing.value?.location || '',
    pricePerNight: listing.value?.pricePerNight || '0',
    checkIn: reservationForm.value.checkIn,
    checkOut: reservationForm.value.checkOut,
    nights: reservationNights.value,
    total: reservationPricePreview.value || '0',
  }
})

const hasEnoughDiscountTokens = computed(() => {
  return Number(tokenBalance.value || 0) >= discountTokenCost
})

const discountedReservationPrice = computed(() => {
  const total = Number(reservationPricePreview.value || 0)
  if (!total) return '0'

  const discounted = total * (1 - discountPercent / 100)
  return discounted.toFixed(6)
})

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

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function todayStart() {
  return startOfDay(new Date())
}

function yesterdayEnd() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return endOfDay(d)
}

function dayBefore(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateFromUnix(unixSeconds) {
  return new Date(Number(unixSeconds) * 1000)
}

function formatDateForInput(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateForDisplay(dateString) {
  if (!dateString) return ''

  const d = new Date(dateString)
  return d.toLocaleDateString('hr-HR')
}

function clearSelectedDates() {
  selectedRange.value = { start: null, end: null }
  ;((reservationForm.value.checkIn = ''),
    (reservationForm.value.checkOut = ''),
    (reservationPricePreview.value = '0'))
}

const bookedRanges = computed(() => {
  return listingReservations.value
    .filter((reservation) => ['0', '3'].includes(reservation.status))
    .map((reservation) => {
      const start = startOfDay(toDateFromUnix(reservation.checkInTimestamp))
      const checkout = startOfDay(toDateFromUnix(reservation.checkOutTimestamp))
      const end = dayBefore(checkout)

      return {
        start,
        end,
      }
    })
    .filter((range) => range.end >= range.start)
})

const calendarAttributes = computed(() => {
  const attrs = [
    {
      key: 'past-dates',
      dates: { end: yesterdayEnd() },
      customData: { type: 'past' },
      content: { class: 'is-crossed' },
    },
  ]

  bookedRanges.value.forEach((range, index) => {
    attrs.push({
      key: `booked-${index}`,
      dates: {
        start: startOfDay(range.start),
        end: startOfDay(range.end),
      },
      customData: { type: 'booked' },
      content: { class: 'is-crossed booked' },
    })
  })

  return attrs
})

const disabledDates = computed(() => {
  return [{ end: yesterdayEnd() }, ...bookedRanges.value]
})

watch(
  () => selectedRange.value,
  async (range) => {
    if (!range?.start || !range?.end) {
      reservationForm.value.checkIn = ''
      reservationForm.value.checkOut = ''
      reservationPricePreview.value = '0'
      return
    }

    reservationForm.value.checkIn = formatDateForInput(range.start)
    reservationForm.value.checkOut = formatDateForInput(range.end)

    await updateReservationPreview()

    isCalendarOpen.value = false
  },
  { deep: true },
)

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
  await Promise.all([loadCurrentListing(), loadTokenBalance()])
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

          <div class="content-card" v-if="listingContent">
            <h2>{{ listingContent.propertyType || 'Smještaj' }} — {{ listing.location }}</h2>
            <p class="listing-meta-line">
              {{ listingContent.guestCount || 0 }} gostiju ·
              {{ listingContent.bedrooms || 0 }} spavaće sobe ·
              {{ listingContent.beds || 0 }} kreveta · {{ listingContent.bathrooms || 0 }} kupaonica
            </p>
          </div>

          <div class="content-card" v-if="listingContent?.highlights?.length">
            <h2>Istaknute prednosti</h2>

            <div class="highlights-list">
              <div
                v-for="(item, index) in listingContent.highlights"
                :key="index"
                class="highlight-item"
              >
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>
            </div>
          </div>

          <div class="content-card" v-if="listingContent?.amenities?.length">
            <h2>Što ovaj smještaj nudi</h2>

            <div class="amenities-grid">
              <div
                v-for="(amenity, index) in listingContent.amenities.slice(0, 8)"
                :key="index"
                class="amenity-row"
              >
                {{ amenity }}
              </div>
            </div>

            <button class="section-link-btn" @click="isAmenitiesModalOpen = true">
              Prikaži sve sadržaje ({{ listingContent.amenities.length }})
            </button>
          </div>

          <div class="content-card" v-if="listingContent?.sleepingArrangements?.length">
            <h2>Gdje ćete spavati</h2>

            <div class="sleeping-grid">
              <div
                v-for="(room, index) in listingContent.sleepingArrangements"
                :key="index"
                class="sleeping-card"
              >
                <div class="sleeping-card__image">
                  <img
                    v-if="room.imageUrl"
                    :src="room.imageUrl"
                    :alt="room.title"
                    class="sleeping-card__img"
                  />
                  <div v-else class="sleeping-card__placeholder">Room</div>
                </div>

                <h3>{{ room.title }}</h3>
                <p>{{ room.subtitle }}</p>
              </div>
            </div>
          </div>

          <div class="content-card" v-if="listingContent">
            <ListingMapCard
              :latitude="listingContent?.latitude"
              :longitude="listingContent?.longitude"
              :title="listingContent?.locationTitle || listing.title"
              :description="listingContent?.locationDescription || listing.location"
            />
          </div>
          <div class="content-card" v-if="listingContent?.houseRules?.length">
            <h2>Kućna pravila</h2>

            <ul class="rules-list">
              <li v-for="(rule, index) in listingContent.houseRules" :key="index">
                {{ rule }}
              </li>
            </ul>
          </div>
          <HostProfileCard
            :profile="hostProfile"
            :average-rating="listing.averageRating || 0"
            :total-reviews="listing.totalReviews || 0"
            :host-wallet="listing.host"
          />
        </div>

        <aside class="booking-sidebar">
          <div class="booking-card">
            <div class="price-top">
              <strong>{{ listing.pricePerNight }} ETH</strong>
              <span>/ noć</span>
            </div>

            <div class="booking-date-box" @click="isCalendarOpen = true">
              <div class="booking-date-cell">
                <span class="booking-label">DOLAZAK</span>
                <strong>{{
                  reservationForm.checkIn
                    ? formatDateForDisplay(reservationForm.checkIn)
                    : 'Dodaj datum'
                }}</strong>
              </div>

              <div class="booking-date-cell">
                <span class="booking-label">ODLAZAK</span>
                <strong>{{
                  reservationForm.checkOut
                    ? formatDateForDisplay(reservationForm.checkOut)
                    : 'Dodaj datum'
                }}</strong>
              </div>
            </div>

            <div class="booking-info-strip">Besplatno otkazivanje do 48h prije dolaska</div>

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

            <div v-if="reservationNights > 0" class="loyalty-box">
              <div class="loyalty-box__top">
                <strong>Loyalty popust</strong>
                <span>MST balans: {{ Number(tokenBalance).toFixed(2) }}</span>
              </div>

              <p class="loyalty-box__text">
                Iskoristi {{ discountTokenCost }} MST za {{ discountPercent }}% popusta na ovu
                rezervaciju.
              </p>

              <div class="loyalty-price-row">
                <span>Cijena s popustom</span>
                <strong>{{ discountedReservationPrice }} ETH</strong>
              </div>

              <label class="loyalty-check">
                <input
                  v-model="useDiscountBooking"
                  type="checkbox"
                  :disabled="!hasEnoughDiscountTokens"
                />
                <span>Želim koristiti loyalty popust</span>
              </label>

              <button
                v-if="useDiscountBooking && !isDiscountApproved"
                class="approve-btn"
                type="button"
                @click="handleApproveDiscount"
                :disabled="!hasEnoughDiscountTokens || isBooking"
              >
                Approve {{ discountTokenCost }} MST
              </button>

              <div v-if="useDiscountBooking && !hasEnoughDiscountTokens" class="loyalty-warning">
                Nemaš dovoljno MST tokena za loyalty popust.
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
              :disabled="
                isBooking ||
                isOwnListing ||
                !listing.isActive ||
                !reservationForm.checkIn ||
                !reservationForm.checkOut ||
                (useDiscountBooking && !isDiscountApproved)
              "
            >
              {{
                isOwnListing
                  ? 'Vlastiti oglas'
                  : isBooking
                    ? 'Slanje transakcije...'
                    : useDiscountBooking
                      ? 'Rezerviraj s popustom'
                      : 'Rezerviraj'
              }}
            </button>

            <p class="booking-note">Sredstva se drže u escrowu do trenutka isplate domaćinu.</p>
          </div>

          <div v-if="isCalendarOpen" class="calendar-modal" @click.self="isCalendarOpen = false">
            <div class="calendar-modal__dialog">
              <div class="calendar-modal__top">
                <div>
                  <h3>
                    {{ reservationNights > 0 ? `${reservationNights} noćenja` : 'Odaberi datume' }}
                  </h3>
                  <p>
                    {{
                      reservationForm.checkIn && reservationForm.checkOut
                        ? `${formatDateForDisplay(reservationForm.checkIn)} - ${formatDateForDisplay(reservationForm.checkOut)}`
                        : 'Odaberi dolazak i odlazak'
                    }}
                  </p>
                </div>

                <button class="calendar-close" @click="isCalendarOpen = false">✕</button>
              </div>

              <div class="calendar-modal__inputs">
                <div class="calendar-input-box">
                  <span>DOLAZAK</span>
                  <strong>{{
                    reservationForm.checkIn
                      ? formatDateForDisplay(reservationForm.checkIn)
                      : 'Dodaj datum'
                  }}</strong>
                </div>

                <div class="calendar-input-box">
                  <span>ODLAZAK</span>
                  <strong>{{
                    reservationForm.checkOut
                      ? formatDateForDisplay(reservationForm.checkOut)
                      : 'Dodaj datum'
                  }}</strong>
                </div>
              </div>

              <VDatePicker
                v-model.range="selectedRange"
                :attributes="calendarAttributes"
                :disabled-dates="disabledDates"
                :min-date="todayStart()"
                :columns="2"
                borderless
                transparent
                expanded
              />

              <div class="calendar-modal__footer">
                <button class="calendar-clear" @click="clearSelectedDates">Izbriši datume</button>

                <button class="calendar-done" @click="isCalendarOpen = false">Zatvori</button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <div v-if="isCheckoutOpen" class="checkout-modal" @click.self="isCheckoutOpen = false">
        <div class="checkout-modal__dialog">
          <div class="checkout-modal__top">
            <div>
              <h3>Potvrda rezervacije</h3>
              <p>Pregledaj detalje prije slanja blockchain transakcije.</p>
            </div>

            <button class="checkout-close" @click="isCheckoutOpen = false">✕</button>
          </div>

          <div class="checkout-summary">
            <div class="checkout-summary__image">
              <img
                v-if="listing.imageUrl"
                :src="listing.imageUrl"
                :alt="listing.title"
                class="checkout-summary__img"
              />
              <div v-else class="checkout-summary__placeholder">mStay</div>
            </div>

            <div class="checkout-summary__body">
              <h4>{{ checkoutSummary.title }}</h4>
              <p class="checkout-summary__location">{{ checkoutSummary.location }}</p>

              <div class="checkout-summary__grid">
                <div class="checkout-item">
                  <span>Dolazak</span>
                  <strong>{{ formatDateForDisplay(checkoutSummary.checkIn) }}</strong>
                </div>

                <div class="checkout-item">
                  <span>Odlazak</span>
                  <strong>{{ formatDateForDisplay(checkoutSummary.checkOut) }}</strong>
                </div>

                <div class="checkout-item">
                  <span>Noćenja</span>
                  <strong>{{ checkoutSummary.nights }}</strong>
                </div>

                <div class="checkout-item">
                  <span>Cijena / noć</span>
                  <strong>{{ checkoutSummary.pricePerNight }} ETH</strong>
                </div>
              </div>

              <div class="checkout-total">
                <span>Ukupno za platiti</span>
                <strong
                  >{{
                    useDiscountBooking ? discountedReservationPrice : checkoutSummary.total
                  }}
                  ETH</strong
                >
              </div>

              <div class="checkout-note">
                Plaćanje ide kroz escrow model. Sredstva se zaključavaju do trenutka isplate
                domaćinu.
              </div>

              <div v-if="bookingError" class="booking-message booking-message--error">
                {{ bookingError }}
              </div>

              <div class="checkout-actions">
                <button class="checkout-secondary" @click="isCheckoutOpen = false">Odustani</button>

                <button
                  class="checkout-primary"
                  @click="
                    useDiscountBooking ? confirmReservationWithDiscount() : confirmReservation()
                  "
                  :disabled="isBooking"
                >
                  {{
                    isBooking
                      ? 'Slanje transakcije...'
                      : useDiscountBooking
                        ? 'Potvrdi rezervaciju s popustom'
                        : 'Potvrdi rezervaciju'
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isDescriptionModalOpen"
        class="section-modal"
        @click.self="isDescriptionModalOpen = false"
      >
        <div class="section-modal__dialog">
          <button class="section-modal__close" @click="isDescriptionModalOpen = false">✕</button>
          <h2>Više o smještaju</h2>
          <p class="section-modal__text">
            {{
              listingContent?.descriptionLong ||
              listingContent?.descriptionShort ||
              'Opis nije dostupan.'
            }}
          </p>
        </div>
      </div>

      <div
        v-if="isAmenitiesModalOpen"
        class="section-modal"
        @click.self="isAmenitiesModalOpen = false"
      >
        <div class="section-modal__dialog">
          <button class="section-modal__close" @click="isAmenitiesModalOpen = false">✕</button>
          <h2>Svi sadržaji</h2>

          <div class="amenities-grid amenities-grid--modal">
            <div
              v-for="(amenity, index) in listingContent?.amenities || []"
              :key="index"
              class="amenity-row"
            >
              {{ amenity }}
            </div>
          </div>
        </div>
      </div>
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

.booking-date-box {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #bdbdbd;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 14px;
  cursor: pointer;
  background: #fff;
}

.booking-date-cell {
  padding: 14px 16px;
  min-height: 78px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.booking-date-cell + .booking-date-cell {
  border-left: 1px solid #d4d4d4;
}

.booking-label {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #111827;
  margin-bottom: 4px;
}

.booking-info-strip {
  background: #f5f5f5;
  border-radius: 14px;
  padding: 12px 14px;
  color: #374151;
  font-size: 0.93rem;
  text-align: center;
  margin-bottom: 16px;
}

.calendar-modal {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.calendar-modal__dialog {
  width: min(1120px, 100%);
  background: #fff;
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.18);
}

.calendar-modal__top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  margin-bottom: 18px;
}

.calendar-modal__top h3 {
  margin: 0 0 6px;
  font-size: 2rem;
}

.calendar-modal__top p {
  margin: 0;
  color: var(--muted);
  font-size: 1rem;
}

.calendar-close {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  font-size: 1.2rem;
  cursor: pointer;
}

.calendar-modal__inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid #bdbdbd;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 20px;
  max-width: 620px;
}

.calendar-input-box {
  padding: 14px 16px;
  min-height: 78px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #fff;
}

.calendar-input-box + .calendar-input-box {
  border-left: 1px solid #d4d4d4;
}

.calendar-input-box span {
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.calendar-modal__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
}

.calendar-clear {
  border: 0;
  background: transparent;
  text-decoration: underline;
  font-weight: 700;
  cursor: pointer;
}

.calendar-done {
  border: 0;
  border-radius: 14px;
  padding: 12px 18px;
  background: #111827;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

:deep(.vc-day-content.is-crossed) {
  color: #b8b8b8 !important;
  text-decoration: line-through !important;
}

:deep(.vc-day-content.is-crossed.booked) {
  color: #9ca3af !important;
  text-decoration: line-through !important;
}

:deep(.vc-day.is-disabled .vc-day-content.is-crossed) {
  opacity: 1 !important;
}

:deep(.vc-day.is-disabled) {
  opacity: 1 !important;
}

:deep(.vc-day-content) {
  font-weight: 600;
  border-radius: 999px;
}

:deep(.vc-highlight) {
  background: rgba(255, 56, 92, 0.14) !important;
}

:deep(.vc-highlight-content-solid) {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark)) !important;
  color: #fff !important;
}

:deep(.vc-container) {
  width: 100%;
  border: 0;
  background: #fff;
}

:deep(.vc-pane-layout) {
  gap: 28px;
}

:deep(.vc-weekday) {
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 8px;
}

.checkout-modal {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.42);
  z-index: 1250;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.checkout-modal__dialog {
  width: min(920px, 100%);
  background: white;
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.18);
}

.checkout-modal__top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 16px;
  margin-bottom: 20px;
}

.checkout-modal__top h3 {
  margin: 0 0 6px;
  font-size: 1.9rem;
}

.checkout-modal__top p {
  margin: 0;
  color: var(--muted);
}

.checkout-close {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  font-size: 1.2rem;
  cursor: pointer;
}

.checkout-summary {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 22px;
}

.checkout-summary__image {
  height: 280px;
  border-radius: 22px;
  overflow: hidden;
  background: #f3f4f6;
}

.checkout-summary__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.checkout-summary__placeholder {
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

.checkout-summary__body h4 {
  margin: 0 0 6px;
  font-size: 1.25rem;
}

.checkout-summary__location {
  margin: 0 0 16px;
  color: var(--muted);
}

.checkout-summary__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.checkout-item {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 14px;
}

.checkout-item span {
  display: block;
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.checkout-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #ececec;
  border-bottom: 1px solid #ececec;
  padding: 16px 0;
  margin-bottom: 16px;
}

.checkout-total span {
  color: #374151;
}

.checkout-total strong {
  font-size: 1.4rem;
}

.checkout-note {
  background: #f9fafb;
  border: 1px solid #eceff3;
  border-radius: 16px;
  padding: 14px 16px;
  color: #4b5563;
  line-height: 1.6;
  margin-bottom: 16px;
}

.checkout-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.checkout-secondary,
.checkout-primary {
  border: 0;
  border-radius: 16px;
  padding: 13px 18px;
  font-weight: 700;
  cursor: pointer;
}

.checkout-secondary {
  background: #f3f4f6;
  color: #111827;
}

.checkout-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
}

.checkout-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.listing-meta-line {
  color: #374151;
  font-weight: 600;
}

.highlights-list {
  display: grid;
  gap: 14px;
}

.highlight-item {
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.highlight-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.highlight-item h3 {
  margin: 0 0 6px;
  font-size: 1rem;
}

.highlight-item p {
  margin: 0;
  color: #4b5563;
}

.description-preview {
  margin-bottom: 14px !important;
}

.section-link-btn {
  border: 0;
  background: #f3f4f6;
  color: #111827;
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
}

.amenities-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.amenity-row {
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  color: #374151;
}

.sleeping-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.sleeping-card {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 20px;
  overflow: hidden;
}

.sleeping-card__image {
  height: 180px;
  background: #f3f4f6;
}

.sleeping-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sleeping-card__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #374151;
}

.sleeping-card h3 {
  margin: 14px 14px 6px;
}

.sleeping-card p {
  margin: 0 14px 14px;
  color: var(--muted);
}

.location-title {
  font-weight: 700;
  margin-bottom: 10px !important;
}

.location-description {
  color: #4b5563;
  line-height: 1.75;
}

.rules-list {
  margin: 0;
  padding-left: 18px;
}

.rules-list li {
  margin-bottom: 8px;
  color: #374151;
}

.section-modal {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.42);
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.section-modal__dialog {
  width: min(900px, 100%);
  max-height: 85vh;
  overflow: auto;
  background: white;
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.18);
  position: relative;
}

.section-modal__close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  font-size: 1.15rem;
  cursor: pointer;
}

.section-modal__dialog h2 {
  margin: 0 0 18px;
}

.section-modal__text {
  white-space: pre-line;
  color: #374151;
  line-height: 1.8;
}

.amenities-grid--modal {
  margin-bottom: 0;
}

.loyalty-box {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.loyalty-box__top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.loyalty-box__top strong {
  color: #9a3412;
}

.loyalty-box__top span {
  color: #7c2d12;
  font-weight: 700;
  font-size: 0.92rem;
}

.loyalty-box__text {
  margin: 0 0 12px !important;
  color: #7c2d12 !important;
  line-height: 1.6;
}

.loyalty-price-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-weight: 700;
  color: #7c2d12;
}

.loyalty-check {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #7c2d12;
}

.approve-btn {
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 13px 14px;
  background: #9a3412;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.approve-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.loyalty-warning {
  margin-top: 8px;
  font-size: 0.9rem;
  color: #b91c1c;
  font-weight: 600;
}

@media (max-width: 900px) {
  .sleeping-grid,
  .amenities-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .checkout-summary {
    grid-template-columns: 1fr;
  }

  .checkout-summary__image {
    height: 240px;
  }
}

@media (max-width: 700px) {
  .checkout-summary__grid {
    grid-template-columns: 1fr;
  }

  .checkout-actions {
    flex-direction: column;
  }

  .checkout-secondary,
  .checkout-primary {
    width: 100%;
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
