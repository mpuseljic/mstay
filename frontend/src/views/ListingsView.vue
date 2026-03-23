<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import ListingCard from '../components/listings/ListingCard.vue'
import { useMstay } from '../composables/useMstay'
import AppFooter from '@/components/layout/AppFooter.vue'

const router = useRouter()

const { walletAddress, listings, successMsg, errorMsg, connectCurrentWallet, loadListings } =
  useMstay()

const search = ref('')
const filters = ref({
  search: '',
  maxPrice: '',
  onlyActive: true,
})

const filteredListings = computed(() => {
  return listings.value.filter((listing) => {
    const matchesSearch =
      !filters.value.search ||
      listing.title.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      listing.location.toLowerCase().includes(filters.value.search.toLowerCase())

    const matchesPrice =
      !filters.value.maxPrice || Number(listing.pricePerNight) <= Number(filters.value.maxPrice)

    const matchesActive = !filters.value.onlyActive || listing.isActive

    return matchesSearch && matchesPrice && matchesActive
  })
})

function handleReserve(listing) {
  router.push(`/listings/${listing.id}`)
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
          <p>Pretraži oglase po lokaciji, naslovu i cijeni.</p>
        </div>
      </section>

      <section class="filters-card">
        <div class="filters-grid">
          <div class="filter-group filter-group--wide">
            <label>Pretraga</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Npr. Pula, Arena, apartman..."
            />
          </div>

          <div class="filter-group">
            <label>Maks. cijena (ETH)</label>
            <input
              v-model="filters.maxPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Npr. 0.5"
            />
          </div>

          <div class="filter-toggle">
            <label>
              <input v-model="filters.onlyActive" type="checkbox" />
              Samo aktivni oglasi
            </label>
          </div>
        </div>
      </section>

      <section v-if="successMsg" class="alert alert--success">{{ successMsg }}</section>
      <section v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</section>

      <section class="results-head">
        <div>
          <h2>{{ filteredListings.length }} stays</h2>
          <p>Rezultati filtrirani prema odabranim kriterijima.</p>
        </div>
      </section>

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

    <AppFooter />
  </div>
</template>

<style scoped>
.page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.header-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow);
  margin-bottom: 20px;
}

.header-card h1 {
  margin: 0 0 6px;
}

.header-card p {
  margin: 0;
  color: var(--muted);
}

.filters-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 20px;
  box-shadow: var(--shadow);
  margin-bottom: 22px;
}

.filters-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 16px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group--wide {
  min-width: 0;
}

.filter-group label,
.filter-toggle label {
  font-weight: 700;
  color: #374151;
}

.filter-group input {
  border: 1px solid #dddddd;
  border-radius: 16px;
  padding: 14px 16px;
}

.filter-toggle {
  display: flex;
  align-items: center;
  min-height: 48px;
}

.filter-toggle input {
  margin-right: 8px;
}

.results-head {
  margin-bottom: 18px;
}

.results-head h2 {
  margin: 0 0 6px;
}

.results-head p {
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

@media (max-width: 1100px) {
  .filters-grid,
  .listing-grid {
    grid-template-columns: 1fr 1fr;
  }

  .filter-group--wide {
    grid-column: 1 / -1;
  }
}

@media (max-width: 700px) {
  .filters-grid,
  .listing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
