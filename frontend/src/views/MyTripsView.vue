<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import ReservationCard from '../components/reservations/ReservationCard.vue'
import { useMstay } from '../composables/useMstay'

const {
  walletAddress,
  myReservations,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadMyReservations,
  cancelReservationByGuest,
} = useMstay()

const activeTripsCount = computed(() => {
  return myReservations.value.filter((reservation) => reservation.status === '0').length
})

const pastTripsCount = computed(() => {
  return myReservations.value.filter((reservation) =>
    ['1', '2', '3', '4'].includes(reservation.status),
  ).length
})

async function handleGuestCancel(id) {
  await cancelReservationByGuest(Number(id))
  await loadMyReservations()
}

onMounted(async () => {
  if (walletAddress.value) {
    await loadMyReservations()
  }
})
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <section class="hero">
        <div class="hero__copy">
          <span class="eyebrow">Guest dashboard</span>
          <h1>My Trips</h1>
          <p>
            Ovdje vidiš sve svoje rezervacije kao gost, njihov status i moguće akcije poput
            otkazivanja rezervacije prije check-ina.
          </p>
        </div>

        <div class="hero__stats">
          <div class="stat-card">
            <span class="stat-label">Aktivne rezervacije</span>
            <strong class="stat-value">{{ activeTripsCount }}</strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Završene / arhivirane</span>
            <strong class="stat-value">{{ pastTripsCount }}</strong>
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
          <h2>Your reservations</h2>
          <p>Pregled svih rezervacija koje si napravila kao gost.</p>
        </div>

        <RouterLink to="/listings" class="explore-btn"> Explore stays </RouterLink>
      </section>

      <section v-if="myReservations.length === 0" class="empty-state">
        <div class="empty-state__icon">✈️</div>
        <h3>Nemaš još nijednu rezervaciju</h3>
        <p>
          Kada rezerviraš neki smještaj, ovdje će se prikazati tvoje aktivne i prošle rezervacije.
        </p>
        <RouterLink to="/listings" class="primary-link-btn"> Pregledaj oglase </RouterLink>
      </section>

      <section v-else class="reservation-grid">
        <ReservationCard
          v-for="reservation in myReservations"
          :key="reservation.id"
          :reservation="reservation"
          mode="guest"
          @guest-cancel="handleGuestCancel"
        />
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
}

.reservation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.empty-state {
  background: white;
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 44px 28px;
  text-align: center;
  box-shadow: var(--shadow);
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
