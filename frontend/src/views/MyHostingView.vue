<script setup>
import { onMounted } from 'vue'
import AppNavbar from '../components/layout/AppNavbar.vue'
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
} = useMstay()

async function handleHostCancel(id) {
  await cancelReservationByHost(Number(id))
  await loadHostReservations()
}

async function handleHostPayout(id) {
  await releasePayout(Number(id))
  await loadHostReservations()
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
      <section class="head">
        <h1>Hosting dashboard</h1>
        <p>Upravljaj rezervacijama koje su napravljene za tvoje oglase.</p>
      </section>

      <section v-if="successMsg" class="alert alert--success">{{ successMsg }}</section>
      <section v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</section>

      <section class="reservation-grid">
        <ReservationCard
          v-for="reservation in hostReservations"
          :key="reservation.id"
          :reservation="reservation"
          mode="host"
          @host-cancel="handleHostCancel"
          @host-payout="handleHostPayout"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.head {
  margin-bottom: 20px;
}

.head h1 {
  margin: 0 0 6px;
}

.head p {
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

@media (max-width: 900px) {
  .reservation-grid {
    grid-template-columns: 1fr;
  }
}
</style>
