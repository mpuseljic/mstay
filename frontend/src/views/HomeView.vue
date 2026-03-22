<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  connectWallet,
  getMStayContract,
  createListing,
  fetchAllListings,
  makeReservation,
  fetchReservationsByGuest,
  cancelReservationByGuest,
  cancelReservationByHost,
  releasePayout,
  fromWeiToEth,
  calculateReservationPrice,
  fetchReservationsByHost,
} from '../services/web3'

const walletAddress = ref('')
const listingCount = ref('')
const errorMsg = ref('')
const successMsg = ref('')
const isSubmitting = ref(false)
const isBooking = ref(false)

const form = ref({
  title: '',
  location: '',
  pricePerNight: '',
})

const reservationForm = ref({
  listingId: '',
  checkIn: '',
  checkOut: '',
})

const listings = ref([])
const myReservations = ref([])
const hostReservations = ref([])
const reservationPricePreview = ref('0')

async function updateReservationPreview() {
  try {
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

    reservationPricePreview.value = fromWeiToEth(totalPriceWei)
  } catch {
    reservationPricePreview.value = '0'
  }
}

const selectedListing = computed(() => {
  return (
    listings.value.find((listing) => listing.id === String(reservationForm.value.listingId)) || null
  )
})

const reservationNights = computed(() => {
  if (!reservationForm.value.checkIn || !reservationForm.value.checkOut) return 0

  const checkIn = new Date(reservationForm.value.checkIn)
  const checkOut = new Date(reservationForm.value.checkOut)

  const diffMs = checkOut.getTime() - checkIn.getTime()
  if (diffMs <= 0) return 0

  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
})

const reservationTotalPrice = computed(() => {
  if (!selectedListing.value || reservationNights.value <= 0) return 0
  return Number(selectedListing.value.pricePerNight) * reservationNights.value
})

function toUnixTimestamp(dateString) {
  return Math.floor(new Date(dateString).getTime() / 1000)
}

function formatDate(unix) {
  return new Date(Number(unix) * 1000).toLocaleDateString('hr-HR')
}

async function handleConnect() {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    walletAddress.value = await connectWallet()
    successMsg.value = 'MetaMask je uspješno spojen.'
    await loadMyReservations()
    await loadHostReservations()
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri spajanju MetaMaska.'
  }
}

async function loadListingCount() {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    const contract = await getMStayContract(false)
    const count = await contract.listingCount()
    listingCount.value = count.toString()
    successMsg.value = 'Podaci iz ugovora su uspješno dohvaćeni.'
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju podataka.'
  }
}

async function loadListings() {
  try {
    const data = await fetchAllListings()
    listings.value = data.map((item) => ({
      id: item.id.toString(),
      host: item.host,
      title: item.title,
      location: item.location,
      pricePerNight: fromWeiToEth(item.pricePerNight),
      isActive: item.isActive,
    }))
  } catch (error) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju oglasa.'
  }
}

async function loadMyReservations() {
  try {
    if (!walletAddress.value) return
    const data = await fetchReservationsByGuest(walletAddress.value)
    myReservations.value = data.map((item) => ({
      id: item.id.toString(),
      listingId: item.listingId.toString(),
      guest: item.guest,
      checkInDate: formatDate(item.checkInDate),
      checkOutDate: formatDate(item.checkOutDate),
      nights: item.nights.toString(),
      totalPrice: fromWeiToEth(item.totalPrice),
      status: item.status.toString(),
    }))
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju rezervacija.'
  }
}

async function loadHostReservations() {
  try {
    if (!walletAddress.value) return

    const data = await fetchReservationsByHost(walletAddress.value)

    hostReservations.value = data.map((item) => ({
      id: item.id.toString(),
      listingId: item.listingId.toString(),
      guest: item.guest,
      checkInDate: formatDate(item.checkInDate),
      checkOutDate: formatDate(item.checkOutDate),
      nights: item.nights.toString(),
      totalPrice: fromWeiToEth(item.totalPrice),
      status: item.status.toString(),
    }))
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju host rezervacija.'
  }
}

function getReservationStatusLabel(status) {
  switch (String(status)) {
    case '0':
      return 'Aktivna'
    case '1':
      return 'Otkazana od gosta'
    case '2':
      return 'Otkazana od domaćina'
    case '3':
      return 'Isplaćeno domaćinu'
    case '4':
      return 'Refundirano'
    default:
      return 'Nepoznato'
  }
}

async function handleCreateListing() {
  try {
    errorMsg.value = ''
    successMsg.value = ''

    if (!form.value.title || !form.value.location || !form.value.pricePerNight) {
      errorMsg.value = 'Sva polja su obavezna.'
      return
    }

    isSubmitting.value = true

    await createListing(form.value.title, form.value.location, Number(form.value.pricePerNight))

    successMsg.value = 'Oglas je uspješno kreiran.'

    form.value = {
      title: '',
      location: '',
      pricePerNight: '',
    }

    await loadListingCount()
    await loadListings()
  } catch (error) {
    errorMsg.value = err.message || 'Greška pri kreiranju oglasa.'
  } finally {
    isSubmitting.value = false
  }
}

function selectListingForReservation(listing) {
  if (walletAddress.value && listing.host.toLowerCase() === walletAddress.value.toLowerCase()) {
    errorMsg.value = 'Ne možeš rezervirati vlastiti oglas.'
    successMsg.value = ''
    return
  }
  reservationForm.value.listingId = listing.id
  successMsg.value = `Odabran je oglas "${listing.title}" za rezervaciju.`
  errorMsg.value = ''

  const reservationSection = document.getElementById('reservation-section')
  if (reservationSection) {
    reservationSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function handleReservation() {
  try {
    errorMsg.value = ''
    successMsg.value = ''

    if (!walletAddress.value) {
      errorMsg.value = 'Prvo spoji MetaMask.'
      return
    }

    if (
      !reservationForm.value.listingId ||
      !reservationForm.value.checkIn ||
      !reservationForm.value.checkOut
    ) {
      errorMsg.value = 'Sva polja za rezervaciju su obavezna.'
      return
    }

    const checkInTs = toUnixTimestamp(reservationForm.value.checkIn)
    const checkOutTs = toUnixTimestamp(reservationForm.value.checkOut)

    if (selectedListing.value && walletAddress.value) {
      if (selectedListing.value.host.toLowerCase() === walletAddress.value.toLowerCase()) {
        errorMsg.value = 'Ne možeš rezervirati vlastiti oglas.'
        return
      }
    }

    isBooking.value = true

    await makeReservation(Number(reservationForm.value.listingId), checkInTs, checkOutTs)

    successMsg.value = 'Rezervacija je uspješno kreirana.'

    reservationForm.value = {
      listingId: '',
      checkIn: '',
      checkOut: '',
    }

    await loadMyReservations()
    await loadHostReservations()
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri kreiranju rezervacije.'
  } finally {
    isBooking.value = false
  }
}

async function handleGuestCancel(reservationId) {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    await cancelReservationByGuest(Number(reservationId))
    successMsg.value = 'Rezervacija je otkazana i refundirana.'
    await loadMyReservations()
    await loadHostReservations()
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri otkazivanju rezervacije.'
  }
}

async function handleHostCancel(reservationId) {
  try {
    errorMsg.value = ''
    successMsg.value = ''

    await cancelReservationByHost(Number(reservationId))

    successMsg.value = 'Rezervacija je otkazana od domaćina i gostu je vraćen novac.'
    await loadMyReservations()
    await loadHostReservations()
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri otkazivanju rezervacije od strane domaćina.'
  }
}

async function handleHostPayout(reservationId) {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    await releasePayout(Number(reservationId))
    successMsg.value = 'Sredstva su uspješno isplaćena domaćinu.'
    await loadMyReservations()
    await loadHostReservations()
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri isplati domaćinu.'
  }
}

onMounted(async () => {
  await loadListingCount()
  await loadListings()
})
</script>

<template>
  <main class="page">
    <div class="card">
      <h1>mStay</h1>
      <p class="subtitle">Dodavanje oglasa i rezervacija preko smart contracta</p>

      <div class="actions">
        <button @click="handleConnect">Spoji MetaMask</button>
        <button @click="loadListingCount">Dohvati broj oglasa</button>
        <button @click="loadListings">Osvježi oglase</button>
        <button @click="loadMyReservations">Moje rezervacije</button>
      </div>

      <div class="info-box" v-if="walletAddress">
        <strong>Spojeni wallet:</strong>
        <div>{{ walletAddress }}</div>
      </div>

      <div class="info-box" v-if="listingCount !== ''">
        <strong>Broj oglasa u ugovoru:</strong>
        <div>{{ listingCount }}</div>
      </div>

      <div class="form-card">
        <h2>Novi oglas</h2>

        <div class="form-group">
          <label>Naslov</label>
          <input v-model="form.title" type="text" placeholder="Npr. Apartman Arena" />
        </div>

        <div class="form-group">
          <label>Lokacija</label>
          <input v-model="form.location" type="text" placeholder="Npr. Pula" />
        </div>

        <div class="form-group">
          <label>Cijena po noćenju</label>
          <input v-model="form.pricePerNight" type="number" min="1" placeholder="Npr. 120" />
        </div>

        <button @click="handleCreateListing" :disabled="isSubmitting">
          {{ isSubmitting ? 'Spremanje...' : 'Dodaj oglas' }}
        </button>
      </div>

      <div class="listings-section">
        <h2>Popis oglasa</h2>

        <p v-if="listings.length === 0" class="empty-text">Trenutno nema oglasa.</p>

        <div v-else class="listing-grid">
          <div v-for="listing in listings" :key="listing.id" class="listing-card">
            <div class="listing-top">
              <h3>{{ listing.title }}</h3>
              <span class="badge">{{ listing.isActive ? 'Aktivan' : 'Neaktivan' }}</span>
            </div>

            <p><strong>ID:</strong> {{ listing.id }}</p>
            <p><strong>Lokacija:</strong> {{ listing.location }}</p>
            <p><strong>Cijena/noć:</strong> {{ listing.pricePerNight }} ETH</p>
            <p><strong>Domaćin:</strong> {{ listing.host }}</p>

            <button
              class="reserve-btn"
              @click="selectListingForReservation(listing)"
              :disabled="
                !listing.isActive ||
                (walletAddress && listing.host.toLowerCase() === walletAddress.toLowerCase())
              "
            >
              {{
                walletAddress && listing.host.toLowerCase() === walletAddress.toLowerCase()
                  ? 'Vlastiti oglas'
                  : 'Rezerviraj'
              }}
            </button>
          </div>
        </div>
      </div>

      <div class="form-card">
        <h2>Napravi rezervaciju</h2>

        <p v-if="reservationForm.listingId" class="selected-listing-info">
          Odabrani oglas ID: <strong>{{ reservationForm.listingId }}</strong>
        </p>

        <p v-if="selectedListing" class="selected-listing-info">
          Odabrani oglas: <strong>{{ selectedListing.title }}</strong> —
          {{ selectedListing.location }}
        </p>

        <div v-if="selectedListing && reservationNights > 0" class="reservation-preview">
          <p><strong>Broj noćenja:</strong> {{ reservationNights }}</p>
          <p><strong>Cijena po noći:</strong> {{ selectedListing.pricePerNight }} ETH</p>
          <p><strong>Ukupna cijena:</strong> {{ reservationTotalPrice }} ETH</p>
        </div>

        <div class="form-group">
          <label>ID oglasa</label>
          <input
            v-model="reservationForm.listingId"
            type="number"
            min="1"
            placeholder="Odaberi oglas klikom na gumb Rezerviraj"
            readonly
          />
        </div>

        <div class="form-group">
          <label>Check-in datum</label>
          <input v-model="reservationForm.checkIn" type="date" />
        </div>

        <div class="form-group">
          <label>Check-out datum</label>
          <input v-model="reservationForm.checkOut" type="date" />
        </div>

        <button @click="handleReservation" :disabled="isBooking">
          {{ isBooking ? 'Spremanje...' : 'Rezerviraj' }}
        </button>
      </div>

      <div class="listings-section">
        <h2>Moje rezervacije</h2>

        <p v-if="myReservations.length === 0" class="empty-text">Nema rezervacija za prikaz.</p>

        <div v-else class="listing-grid">
          <div v-for="reservation in myReservations" :key="reservation.id" class="listing-card">
            <div class="listing-top">
              <h3>Rezervacija #{{ reservation.id }}</h3>
              <span class="badge">{{ getReservationStatusLabel(reservation.status) }}</span>
            </div>

            <p><strong>ID oglasa:</strong> {{ reservation.listingId }}</p>
            <p><strong>Check-in:</strong> {{ reservation.checkInDate }}</p>
            <p><strong>Check-out:</strong> {{ reservation.checkOutDate }}</p>
            <p><strong>Noćenja:</strong> {{ reservation.nights }}</p>
            <p><strong>Ukupna cijena:</strong> {{ reservation.totalPrice }} ETH</p>

            <div class="reservation-actions">
              <button
                class="danger-btn"
                @click="handleGuestCancel(reservation.id)"
                v-if="reservation.status === '0'"
              >
                Otkaži kao gost
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="listings-section">
        <h2>Rezervacije za moje oglase</h2>

        <p v-if="hostReservations.length === 0" class="empty-text">
          Nema rezervacija za tvoje oglase.
        </p>

        <div v-else class="listing-grid">
          <div v-for="reservation in hostReservations" :key="reservation.id" class="listing-card">
            <div class="listing-top">
              <h3>Rezervacija #{{ reservation.id }}</h3>
              <span class="badge">
                {{ getReservationStatusLabel(reservation.status) }}
              </span>
            </div>

            <p><strong>ID oglasa:</strong> {{ reservation.listingId }}</p>
            <p><strong>Gost:</strong> {{ reservation.guest }}</p>
            <p><strong>Check-in:</strong> {{ reservation.checkInDate }}</p>
            <p><strong>Check-out:</strong> {{ reservation.checkOutDate }}</p>
            <p><strong>Noćenja:</strong> {{ reservation.nights }}</p>
            <p><strong>Ukupna cijena:</strong> {{ reservation.totalPrice }} ETH</p>

            <div class="reservation-actions">
              <button
                class="danger-btn"
                @click="handleHostCancel(reservation.id)"
                v-if="reservation.status === '0'"
              >
                Otkaži kao domaćin
              </button>

              <button
                class="success-btn"
                @click="handleHostPayout(reservation.id)"
                v-if="reservation.status === '0'"
              >
                Isplati domaćinu
              </button>
            </div>
          </div>
        </div>
      </div>
      <p class="success" v-if="successMsg">{{ successMsg }}</p>
      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
    </div>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 32px;
  background: #f6f8fb;
}

.card {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

h1 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 2rem;
}

h2 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 2rem;
}

h3 {
  margin: 0;
}

.subtitle {
  margin-top: 0;
  margin-bottom: 24px;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 12px 18px;
  font-weight: 600;
  cursor: pointer;
  background: #111827;
  color: white;
}

button:hover {
  opacity: 0.92;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-box,
.form-card,
.listings-section {
  background: #f9fafb;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

input {
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
}

.listing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.listing-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 18px;
}

.listing-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.badge {
  background: #dcfce7;
  color: #166534;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.empty-text {
  color: #6b7280;
  margin: 0;
}

.selected-listing-info {
  margin-top: -4px;
  margin-bottom: 16px;
  color: #374151;
  font-size: 14px;
}

.reservation-preview {
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.reservation-preview p {
  margin: 6px 0;
}

.reserve-btn {
  width: 100%;
  margin-top: 12px;
  background: #2563eb;
}

.reserve-btn:hover {
  opacity: 0.95;
}

.reservation-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.danger-btn {
  background: #dc2626;
}

.success-btn {
  background: #16a34a;
}

.success {
  color: #166534;
  margin-top: 16px;
}

.error {
  color: #b91c1c;
  margin-top: 16px;
}
</style>
