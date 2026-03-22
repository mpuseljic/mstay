<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import ReservationCard from '../components/reservations/ReservationCard.vue'
import { useMstay } from '../composables/useMstay'

const route = useRoute()

const {
  walletAddress,
  listings,
  myReservations,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadListings,
  loadMyReservations,
  cancelReservationByGuest,
  makeReservation,
  calculateReservationPrice,
} = useMstay()

const isBooking = ref(false)
const reservationPricePreview = ref('0')

const reservationForm = ref({
  listingId: route.query.listingId || '',
  checkIn: '',
  checkOut: '',
})

const selectedListing = ref(null)

function toUnixTimestamp(dateString) {
  return Math.floor(new Date(dateString).getTime() / 1000)
}

function fromWei(value) {
  return (Number(value) / 1e18).toString()
}

async function syncSelectedListing() {
  selectedListing.value =
    listings.value.find((x) => x.id === String(reservationForm.value.listingId)) || null
}

async function updateReservationPreview() {
  try {
    await syncSelectedListing()

    if (
      !reservationForm.value.listingId ||
      !reservationForm.value.checkIn ||
      !reservationForm.value.checkOut
    ) {
      reservationPricePreview.value = '0'
      return
    }

    const checkInTs = toUnixTimestamp(reservationForm.value.checkIn)
    const checkOutTs = toUnixTimestamp(reservationForm.value.checkOut)

    const [, totalPriceWei] = await calculateReservationPrice(
      Number(reservationForm.value.listingId),
      checkInTs,
      checkOutTs,
    )

    reservationPricePreview.value = fromWei(totalPriceWei)
  } catch {
    reservationPricePreview.value = '0'
  }
}

async function handleReservation() {
  try {
    isBooking.value = true

    const checkInTs = toUnixTimestamp(reservationForm.value.checkIn)
    const checkOutTs = toUnixTimestamp(reservationForm.value.checkOut)

    await makeReservation(Number(reservationForm.value.listingId), checkInTs, checkOutTs)

    await loadMyReservations()

    reservationForm.value.checkIn = ''
    reservationForm.value.checkOut = ''
    reservationPricePreview.value = '0'
  } finally {
    isBooking.value = false
  }
}

async function handleGuestCancel(id) {
  await cancelReservationByGuest(Number(id))
  await loadMyReservations()
}

watch(
  () => reservationForm.value.listingId,
  async () => {
    await syncSelectedListing()
    await updateReservationPreview()
  },
)

onMounted(async () => {
  await loadListings()
  await syncSelectedListing()
  if (walletAddress.value) {
    await loadMyReservations()
  }
})
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <div class="layout">
        <section class="booking-card">
          <h1>Book your stay</h1>
          <p>Rezerviraj odabrani smještaj preko escrow modela.</p>

          <section v-if="successMsg" class="alert alert--success">{{ successMsg }}</section>
          <section v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</section>

          <div class="form-group">
            <label>ID oglasa</label>
            <input v-model="reservationForm.listingId" type="number" readonly />
          </div>

          <p v-if="selectedListing" class="selected">
            {{ selectedListing.title }} — {{ selectedListing.location }}
          </p>

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

          <div v-if="reservationPricePreview !== '0'" class="preview">
            <span>Ukupna cijena</span>
            <strong>{{ reservationPricePreview }} ETH</strong>
          </div>

          <button class="primary-btn" @click="handleReservation" :disabled="isBooking">
            {{ isBooking ? 'Slanje transakcije...' : 'Rezerviraj' }}
          </button>
        </section>

        <section>
          <div class="section-head">
            <h2>My Trips</h2>
            <p>Rezervacije gdje si gost.</p>
          </div>

          <div class="reservation-grid">
            <ReservationCard
              v-for="reservation in myReservations"
              :key="reservation.id"
              :reservation="reservation"
              mode="guest"
              @guest-cancel="handleGuestCancel"
            />
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 22px;
}

.booking-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 22px;
  box-shadow: var(--shadow);
  height: fit-content;
  position: sticky;
  top: 100px;
}

.booking-card h1 {
  margin: 0 0 6px;
}

.booking-card p {
  margin: 0 0 18px;
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

.selected {
  color: #374151;
  font-weight: 600;
  margin-bottom: 14px !important;
}

.preview {
  background: #fff5f7;
  border: 1px solid #ffd7df;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.primary-btn {
  width: 100%;
  border: 0;
  border-radius: 16px;
  padding: 14px 16px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.section-head {
  margin-bottom: 18px;
}

.section-head h2 {
  margin: 0 0 6px;
}

.section-head p {
  margin: 0;
  color: var(--muted);
}

.reservation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
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

@media (max-width: 1100px) {
  .layout,
  .reservation-grid {
    grid-template-columns: 1fr;
  }

  .booking-card {
    position: static;
  }
}
</style>
