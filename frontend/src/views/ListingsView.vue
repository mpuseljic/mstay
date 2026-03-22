<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import ListingCard from '../components/listings/ListingCard.vue'
import { useMstay } from '../composables/useMstay'

const router = useRouter()

const { walletAddress, listings, successMsg, errorMsg, connectCurrentWallet, loadListings } =
  useMstay()

const search = ref('')

const filteredListings = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return listings.value

  return listings.value.filter((listing) => {
    return listing.title.toLowerCase().includes(q) || listing.location.toLowerCase().includes(q)
  })
})

function handleReserve(listing) {
  router.push({
    path: '/my-trips',
    query: { listingId: listing.id },
  })
}

onMounted(async () => {
  await loadListings()
})
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <section class="header-card">
        <div>
          <h1>Explore stays</h1>
          <p>Pretraži sve oglase i rezerviraj smještaj koji ti odgovara.</p>
        </div>

        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Pretraži po naslovu ili lokaciji"
        />
      </section>

      <section v-if="successMsg" class="alert alert--success">{{ successMsg }}</section>
      <section v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</section>

      <section class="listing-grid">
        <ListingCard
          v-for="listing in filteredListings"
          :key="listing.id"
          :listing="listing"
          :wallet-address="walletAddress"
          @reserve="handleReserve"
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

.header-card {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}

.header-card h1 {
  margin: 0 0 6px;
}

.header-card p {
  margin: 0;
  color: var(--muted);
}

.search-input {
  width: 360px;
  max-width: 100%;
  border: 1px solid #dddddd;
  border-radius: 16px;
  padding: 14px 16px;
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

@media (max-width: 1100px) {
  .listing-grid {
    grid-template-columns: 1fr 1fr;
  }

  .header-card {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }
}

@media (max-width: 700px) {
  .listing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
