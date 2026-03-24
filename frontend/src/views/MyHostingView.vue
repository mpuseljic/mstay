<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import ReservationCard from '../components/reservations/ReservationCard.vue'
import { useMstay } from '../composables/useMstay'

const {
  walletAddress,
  hostReservations,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadHostReservations,
  cancelReservationByHost,
  releasePayout,
  leaveReview,
} = useMstay()

const reviewForm = ref({
  reservationId: '',
  rating: 5,
  comment: '',
})

const reviewMessage = ref('')
const reviewError = ref('')

const activeHostingReservations = computed(() => {
  return hostReservations.value.filter((reservation) => reservation.status === '0').length
})

const closedHostingReservations = computed(() => {
  return hostReservations.value.filter((reservation) =>
    ['1', '2', '3', '4'].includes(reservation.status),
  ).length
})

function canReviewReservation(reservation) {
  const now = Math.floor(Date.now() / 1000)
  return now >= reservation.checkOutTimestamp
}

async function handleHostCancel(id) {
  await cancelReservationByHost(Number(id))
  await loadHostReservations()
}

async function handleHostPayout(id) {
  await releasePayout(Number(id))
  await loadHostReservations()
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
    await loadHostReservations()
  } catch (err) {
    reviewError.value = err.message || 'Greška pri spremanju recenzije.'
  }
}

onMounted(async () => {
  if (walletAddress.value) {
    await loadHostReservations()
  }
})
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
            Ovdje upravljaš rezervacijama za svoje oglase, otkazivanjima, isplatama escrow sredstava
            i ocjenjivanjem gostiju nakon boravka.
          </p>
        </div>

        <div class="hero__stats">
          <div class="stat-card">
            <span class="stat-label">Aktivne host rezervacije</span>
            <strong class="stat-value">{{ activeHostingReservations }}</strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Zatvorene / obrađene</span>
            <strong class="stat-value">{{ closedHostingReservations }}</strong>
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
          <h2>Reservations for your stays</h2>
          <p>Pregled svih rezervacija koje su gosti napravili za tvoje oglase.</p>
        </div>

        <RouterLink to="/create-listing" class="explore-btn"> Dodaj novi oglas </RouterLink>
      </section>

      <section v-if="hostReservations.length === 0" class="empty-state">
        <div class="empty-state__icon">🏠</div>
        <h3>Još nema rezervacija za tvoje oglase</h3>
        <p>
          Kada gost rezervira jedan od tvojih oglasa, ovdje ćeš vidjeti sve detalje, uključujući
          status rezervacije, mogućnost otkazivanja, isplate i recenzije.
        </p>
        <RouterLink to="/create-listing" class="primary-link-btn"> Objavi novi oglas </RouterLink>
      </section>

      <section v-else class="reservation-grid">
        <ReservationCard
          v-for="reservation in hostReservations"
          :key="reservation.id"
          :reservation="reservation"
          mode="host"
          :can-review="canReviewReservation(reservation)"
          @host-cancel="handleHostCancel"
          @host-payout="handleHostPayout"
          @host-review="openHostReviewForm"
        />
      </section>

      <section v-if="reviewForm.reservationId" class="review-panel">
        <h3>Ocijeni gosta</h3>

        <div v-if="reviewError" class="alert alert--error">
          {{ reviewError }}
        </div>

        <div v-if="reviewMessage" class="alert alert--success">
          {{ reviewMessage }}
        </div>

        <div class="review-grid">
          <div class="form-group">
            <label>Ocjena</label>
            <select v-model="reviewForm.rating">
              <option :value="5">5</option>
              <option :value="4">4</option>
              <option :value="3">3</option>
              <option :value="2">2</option>
              <option :value="1">1</option>
            </select>
          </div>

          <div class="form-group form-group--full">
            <label>Komentar</label>
            <textarea
              v-model="reviewForm.comment"
              rows="4"
              placeholder="Napiši kratku recenziju o gostu..."
            ></textarea>
          </div>
        </div>

        <button class="primary-link-btn" @click="handleHostReview">Spremi recenziju</button>
      </section>
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
