<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import ListingCard from '../components/listings/ListingCard.vue'
import { useMstay } from '../composables/useMstay'

const {
  walletAddress,
  listings,
  listingCount,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadListings,
  loadListingCount,
} = useMstay()

function reserveFromHome() {
  window.location.href = '/listings'
}

onMounted(async () => {
  await loadListingCount()
  await loadListings()
})
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <section class="hero">
        <div class="hero__copy">
          <span class="eyebrow">Airbnb-inspired Web3 booking</span>
          <h1>Find unique stays and book them on-chain.</h1>
          <p>
            mStay je decentralizirana aplikacija za objavu smještaja, rezervacije, escrow plaćanja i
            hosting dashboard.
          </p>

          <div class="hero__actions">
            <RouterLink to="/listings" class="btn btn--primary">Explore stays</RouterLink>
            <RouterLink to="/create-listing" class="btn btn--secondary">Become a host</RouterLink>
          </div>
        </div>

        <div class="hero__stats">
          <div class="stat">
            <span>Ukupno oglasa</span>
            <strong>{{ listingCount || '0' }}</strong>
          </div>
          <div class="stat">
            <span>Blockchain</span>
            <strong>Ethereum</strong>
          </div>
          <div class="stat">
            <span>Plaćanje</span>
            <strong>Escrow</strong>
          </div>
          <div class="stat">
            <span>Wallet</span>
            <strong>{{ walletAddress ? 'Connected' : 'Not connected' }}</strong>
          </div>
        </div>
      </section>

      <section v-if="successMsg" class="alert alert--success">{{ successMsg }}</section>
      <section v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</section>

      <section class="section-head">
        <div>
          <h2>Featured stays</h2>
          <p>Pregled najnovijih oglasa na platformi.</p>
        </div>
        <RouterLink to="/listings" class="link-btn">View all</RouterLink>
      </section>

      <section class="listing-grid">
        <ListingCard
          v-for="listing in listings.slice(0, 3)"
          :key="listing.id"
          :listing="listing"
          :wallet-address="walletAddress"
          @reserve="reserveFromHome"
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

.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr;
  gap: 22px;
  padding: 32px;
  border-radius: 28px;
  background: linear-gradient(135deg, #ffffff, #fff7f8);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  margin-bottom: 28px;
}

.eyebrow {
  display: inline-block;
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: 999px;
  background: #fff0f3;
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 700;
}

.hero__copy h1 {
  margin: 0 0 12px;
  font-size: 3rem;
  line-height: 1.05;
}

.hero__copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
  max-width: 660px;
}

.hero__actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.hero__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.stat {
  background: white;
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 18px;
}

.stat span {
  display: block;
  color: var(--muted);
  margin-bottom: 8px;
}

.stat strong {
  font-size: 1.5rem;
  font-weight: 800;
}

.section-head {
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
}

.section-head h2 {
  margin: 0 0 6px;
}

.section-head p {
  margin: 0;
  color: var(--muted);
}

.listing-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.btn,
.link-btn {
  border: 0;
  border-radius: 16px;
  padding: 13px 18px;
  font-weight: 700;
}

.btn--primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
}

.btn--secondary,
.link-btn {
  background: white;
  border: 1px solid var(--border);
  color: var(--text);
}

@media (max-width: 1100px) {
  .hero,
  .listing-grid {
    grid-template-columns: 1fr;
  }

  .hero__copy h1 {
    font-size: 2.2rem;
  }
}
</style>
