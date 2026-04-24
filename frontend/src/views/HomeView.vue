<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import ListingCard from '../components/listings/ListingCard.vue'
import { useMstay } from '../composables/useMstay'

const router = useRouter()

const {
  walletAddress,
  listings,
  listingCount,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadListings,
  loadListingCount,
  tryAutoReconnect,
  setupWalletListeners,
  isMetaMaskInstalled,
  isCorrectNetwork,
} = useMstay()

const featuredListings = computed(() => {
  return listings.value.slice(0, 6)
})

const activeListingsCount = computed(() => {
  return listings.value.filter((listing) => listing.isActive).length
})

const uniqueLocationsCount = computed(() => {
  const locations = new Set(
    listings.value.map((listing) => listing.location?.trim()).filter(Boolean),
  )
  return locations.size
})

function handleReserve(listing) {
  router.push(`/listings/${listing.id}`)
}

onMounted(async () => {
  setupWalletListeners()

  await Promise.all([loadListingCount(), loadListings(), tryAutoReconnect()])
})
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <section class="hero">
        <div class="hero__content">
          <span class="eyebrow">Decentralized travel, elevated</span>
          <h1>Book beautiful stays with on-chain trust.</h1>
          <p>
            mStay combines a modern booking experience with smart contract escrow, seamless MetaMask
            login, and fully transparent on-chain reservations.
          </p>

          <div class="hero__actions">
            <RouterLink to="/listings" class="btn btn--primary"> Explore stays </RouterLink>
            <RouterLink to="/create-listing" class="btn btn--secondary"> Start hosting </RouterLink>
          </div>

          <div class="hero-onboarding" v-if="!walletAddress">
            <div class="hero-onboarding__item" v-if="!isMetaMaskInstalled">
              MetaMask is not installed. Please install a wallet to start booking and hosting stays.
            </div>

            <div class="hero-onboarding__item" v-else-if="!isCorrectNetwork">
              Your wallet is connected to the wrong network. Please switch networks to continue.
            </div>

            <div class="hero-onboarding__item" v-else>
              Your wallet is ready — connect MetaMask to start booking, earning rewards, and
              managing your profile.
            </div>
          </div>

          <div class="hero__chips">
            <span class="chip">Escrow payments</span>
            <span class="chip">MetaMask login</span>
            <span class="chip">On-chain reservations</span>
          </div>
        </div>

        <div class="hero__visual">
          <div class="hero-card hero-card--large">
            <div class="hero-card__label">Featured stay</div>
            <div class="hero-card__body">
              <strong>Modern apartments</strong>
              <span>Secure booking powered by blockchain escrow</span>
            </div>
          </div>

          <div class="hero-mini-grid">
            <div class="hero-card hero-card--mini">
              <span class="mini-title">Active stays</span>
              <strong>{{ activeListingsCount }}</strong>
            </div>
            <div class="hero-card hero-card--mini">
              <span class="mini-title">Locations</span>
              <strong>{{ uniqueLocationsCount }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section v-if="successMsg" class="alert alert--success">
        {{ successMsg }}
      </section>

      <section v-if="errorMsg" class="alert alert--error">
        {{ errorMsg }}
      </section>

      <section class="stats-strip">
        <div class="stat-box">
          <span class="stat-box__label">Total listings</span>
          <strong class="stat-box__value">{{ listingCount || '0' }}</strong>
        </div>

        <div class="stat-box">
          <span class="stat-box__label">Active listings</span>
          <strong class="stat-box__value">{{ activeListingsCount }}</strong>
        </div>

        <div class="stat-box">
          <span class="stat-box__label">Supported locations</span>
          <strong class="stat-box__value">{{ uniqueLocationsCount }}</strong>
        </div>

        <div class="stat-box">
          <span class="stat-box__label">Wallet status</span>
          <strong class="stat-box__value">
            {{ walletAddress ? 'Connected' : 'Not connected' }}
          </strong>
        </div>
      </section>

      <section class="section-head">
        <div>
          <span class="section-kicker">Featured listings</span>
          <h2>Discover unique stays</h2>
          <p>Hand-picked listings that showcase the best of the mStay experience.</p>
        </div>

        <RouterLink to="/listings" class="link-btn"> View all listings </RouterLink>
      </section>

      <section v-if="featuredListings.length" class="listing-grid">
        <ListingCard
          v-for="listing in featuredListings"
          :key="listing.id"
          :listing="listing"
          :wallet-address="walletAddress"
          @reserve="handleReserve"
        />
      </section>

      <section v-else class="empty-hero">
        <div class="empty-hero__icon">✦</div>
        <h3>No featured stays yet</h3>
        <p>Create your first listing and start building a decentralized hosting experience.</p>
        <RouterLink to="/create-listing" class="btn btn--primary">
          Create first listing
        </RouterLink>
      </section>

      <section class="info-grid">
        <article class="info-card">
          <span class="section-kicker">How it works</span>
          <h3>Book with escrow protection</h3>
          <p>
            Guests reserve stays by locking funds in a smart contract. Hosts receive payment only
            after the reservation is successfully completed.
          </p>
        </article>

        <article class="info-card">
          <span class="section-kicker">Host smarter</span>
          <h3>Manage reservations on-chain</h3>
          <p>
            Hosts can track bookings, manage availability, and handle payouts directly through a
            transparent on-chain hosting dashboard.
          </p>
        </article>

        <article class="info-card">
          <span class="section-kicker">Transparent flow</span>
          <h3>Every action is verifiable</h3>
          <p>
            All reservations, status updates, and payouts are recorded on the blockchain, ensuring
            transparency and trust between users.
          </p>
        </article>
      </section>

      <section class="hosting-banner">
        <div class="hosting-banner__copy">
          <span class="section-kicker">For hosts</span>
          <h2>Turn your property into an on-chain experience.</h2>
          <p>
            Create listings, upload photos, manage reservations, and receive secure escrow-based
            payouts through blockchain technology.
          </p>
        </div>

        <div class="hosting-banner__actions">
          <RouterLink to="/create-listing" class="btn btn--primary"> Add a new listing </RouterLink>
          <RouterLink to="/my-hosting" class="btn btn--secondary">
            Open hosting dashboard
          </RouterLink>
        </div>
      </section>

      <section class="section-head section-head--compact">
        <div>
          <span class="section-kicker">Why mStay</span>
          <h2>Built for modern Web3 hospitality</h2>
        </div>
      </section>

      <section class="benefits-grid">
        <div class="benefit-card">
          <div class="benefit-icon">🔐</div>
          <h3>Secure by design</h3>
          <p>Escrow-based bookings reduce risk and increase trust between guests and hosts.</p>
        </div>

        <div class="benefit-card">
          <div class="benefit-icon">⚡</div>
          <h3>Fast booking flow</h3>
          <p>A seamless UX integrated with MetaMask enables quick and intuitive booking.</p>
        </div>

        <div class="benefit-card">
          <div class="benefit-icon">🧾</div>
          <h3>Transparent history</h3>
          <p>All key actions related to reservations and payments are verifiable on-chain.</p>
        </div>
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
  gap: 24px;
  background: linear-gradient(135deg, #ffffff, #fff7f8);
  border: 1px solid var(--border);
  border-radius: 32px;
  padding: 36px;
  box-shadow: var(--shadow);
  margin-bottom: 26px;
}

.hero__content {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.eyebrow,
.section-kicker {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 8px 12px;
  border-radius: 999px;
  background: #fff0f3;
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 700;
}

.hero__content h1 {
  margin: 16px 0 14px;
  font-size: 3.2rem;
  line-height: 1.02;
  letter-spacing: -0.03em;
  max-width: 720px;
}

.hero__content p {
  margin: 0;
  color: var(--muted);
  line-height: 1.8;
  max-width: 720px;
  font-size: 1.02rem;
}

.hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
}

.hero__chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.chip {
  background: white;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #374151;
}

.hero__visual {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 16px;
}

.hero-card {
  background:
    linear-gradient(135deg, rgba(255, 56, 92, 0.16), rgba(255, 56, 92, 0.04)),
    linear-gradient(135deg, #f9fafb, #f3f4f6);
  border: 1px solid #f3d6de;
  border-radius: 28px;
  box-shadow: 0 14px 32px rgba(17, 24, 39, 0.05);
}

.hero-card--large {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px;
}

.hero-card__label {
  width: fit-content;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 700;
}

.hero-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-card__body strong {
  font-size: 1.5rem;
}

.hero-card__body span {
  color: #4b5563;
  line-height: 1.6;
  max-width: 320px;
}

.hero-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.hero-card--mini {
  padding: 18px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.mini-title {
  display: block;
  color: var(--muted);
  font-size: 0.88rem;
  margin-bottom: 8px;
}

.hero-card--mini strong {
  font-size: 1.7rem;
  font-weight: 800;
}

.stats-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 28px;
}

.stat-box {
  background: white;
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 18px;
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.04);
}

.stat-box__label {
  display: block;
  color: var(--muted);
  font-size: 0.88rem;
  margin-bottom: 8px;
}

.stat-box__value {
  font-size: 1.5rem;
  font-weight: 800;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 18px;
  margin-bottom: 18px;
}

.section-head--compact {
  margin-top: 8px;
}

.section-head h2 {
  margin: 10px 0 6px;
  font-size: 2rem;
}

.section-head p {
  margin: 0;
  color: var(--muted);
}

.listing-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 34px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 34px;
}

.info-card,
.benefit-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 22px;
  box-shadow: var(--shadow);
}

.info-card h3,
.benefit-card h3 {
  margin: 14px 0 10px;
  font-size: 1.15rem;
}

.info-card p,
.benefit-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.75;
}

.hosting-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 22px;
  background: linear-gradient(135deg, #111827, #1f2937);
  color: white;
  border-radius: 28px;
  padding: 30px;
  margin-bottom: 34px;
}

.hosting-banner__copy .section-kicker {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.hosting-banner__copy h2 {
  margin: 14px 0 10px;
  font-size: 2rem;
  max-width: 560px;
}

.hosting-banner__copy p {
  margin: 0;
  max-width: 620px;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.75;
}

.hosting-banner__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 220px;
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.benefit-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: #fff1f3;
  font-size: 1.4rem;
}

.empty-hero {
  background: white;
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 42px 28px;
  text-align: center;
  box-shadow: var(--shadow);
  margin-bottom: 34px;
}

.empty-hero__icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff1f3;
  font-size: 1.8rem;
}

.empty-hero h3 {
  margin: 0 0 10px;
  font-size: 1.4rem;
}

.empty-hero p {
  max-width: 560px;
  margin: 0 auto 20px;
  color: var(--muted);
  line-height: 1.75;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  padding: 14px 18px;
  font-weight: 700;
  text-decoration: none;
}

.btn--primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
}

.btn--secondary,
.link-btn {
  background: white;
  color: var(--text);
  border: 1px solid var(--border);
}

.hero-onboarding {
  margin-top: 18px;
}

.hero-onboarding__item {
  border-radius: 16px;
  padding: 12px 14px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
  font-weight: 600;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .hero,
  .stats-strip,
  .listing-grid,
  .info-grid,
  .benefits-grid {
    grid-template-columns: 1fr 1fr;
  }

  .hosting-banner {
    flex-direction: column;
    align-items: start;
  }

  .hosting-banner__actions {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (max-width: 900px) {
  .hero,
  .stats-strip,
  .listing-grid,
  .info-grid,
  .benefits-grid {
    grid-template-columns: 1fr;
  }

  .hero__content h1 {
    font-size: 2.4rem;
  }

  .section-head {
    flex-direction: column;
    align-items: start;
  }

  .hero-mini-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .page {
    padding: 24px 14px 42px;
  }

  .hero {
    padding: 26px 20px;
  }

  .hero__content h1 {
    font-size: 2rem;
  }

  .hosting-banner {
    padding: 24px 20px;
  }

  .hosting-banner__copy h2,
  .section-head h2 {
    font-size: 1.6rem;
  }
}
</style>
