<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import ListingCard from '../components/listings/ListingCard.vue'
import { useMstay } from '../composables/useMstay'
import AppFooter from '@/components/layout/AppFooter.vue'
import { searchListings } from '@/services/search'

const router = useRouter()

const { walletAddress, listings, successMsg, errorMsg, connectCurrentWallet, loadListings } =
  useMstay()

const search = ref('')
const filters = ref({
  search: '',
  maxPrice: '',
  minRating: '',
  onlyActive: true,
  sortBy: 'newest',
  checkIn: '',
  checkOut: '',
})

const searchedListings = ref([])
const isSearching = ref(false)
const searchError = ref('')

const locationOptions = computed(() => {
  const unique = [...new Set(listings.value.map((x) => x.location).filter(Boolean))]
  return unique.sort((a, b) => a.localeCompare(b, 'hr'))
})

const selectedLocation = ref('')

const filteredListings = computed(() => {
  let result = [...searchedListings.value]

  switch (filters.value.sortBy) {
    case 'price-asc':
      result.sort((a, b) => Number(a.pricePerNight) - Number(b.pricePerNight))
      break
    case 'price-desc':
      result.sort((a, b) => Number(b.pricePerNight) - Number(a.pricePerNight))
      break
    case 'rating-desc':
      result.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0))
      break
    case 'reviews-desc':
      result.sort((a, b) => Number(b.totalReviews || 0) - Number(a.totalReviews || 0))
      break
    case 'title-asc':
      result.sort((a, b) => a.title.localeCompare(b.title, 'hr'))
      break
    case 'newest':
    default:
      result.sort((a, b) => Number(b.id) - Number(a.id))
      break
  }

  return result
})

function resetFilters() {
  filters.value = {
    search: '',
    maxPrice: '',
    minRating: '',
    onlyActive: true,
    sortBy: 'newest',
    checkIn: '',
    checkOut: '',
  }
  selectedLocation.value = ''
  searchedListings.value = [...listings.value]
  searchError.value = ''
}

function handleReserve(listing) {
  router.push(`/listings/${listing.id}`)
}

async function runSearch() {
  try {
    isSearching.value = true
    searchError.value = ''

    searchedListings.value = await searchListings({
      listings: listings.value,
      search: filters.value.search,
      location: selectedLocation.value,
      maxPrice: filters.value.maxPrice,
      minRating: filters.value.minRating,
      onlyActive: filters.value.onlyActive,
      checkIn: filters.value.checkIn,
      checkOut: filters.value.checkOut,
    })
  } catch (err) {
    searchError.value = err.message || 'Greška kod pretrage.'
    searchedListings.value = [...listings.value]
  } finally {
    isSearching.value = false
  }
}

onMounted(async () => {
  await loadListings()
  searchedListings.value = [...listings.value]
})
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <section class="header-card">
        <div>
          <h1>Explore stays</h1>
          <p>Search, filter, and sort listings by price, location, and rating.</p>
        </div>
      </section>

      <section class="filters-card">
        <div class="filters-grid">
          <div class="filter-group filter-group--wide">
            <label>Search</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="e.g. Pula, Arena, apartment..."
            />
          </div>

          <div class="filter-group">
            <label>Location</label>
            <select v-model="selectedLocation">
              <option value="">All locations</option>
              <option v-for="location in locationOptions" :key="location" :value="location">
                {{ location }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>Check-in</label>
            <input v-model="filters.checkIn" type="date" />
          </div>

          <div class="filter-group">
            <label>Check-out</label>
            <input v-model="filters.checkOut" type="date" />
          </div>

          <div class="filter-group">
            <label>Max price (ETH)</label>
            <input
              v-model="filters.maxPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 0.5"
            />
          </div>

          <div class="filter-group">
            <label>Minimum rating</label>
            <select v-model="filters.minRating">
              <option value="">All</option>
              <option value="5">5.0</option>
              <option value="4">4.0+</option>
              <option value="3">3.0+</option>
              <option value="2">2.0+</option>
              <option value="1">1.0+</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Sort by</label>
            <select v-model="filters.sortBy">
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="rating-desc">Rating: highest first</option>
              <option value="reviews-desc">Most reviewed</option>
              <option value="title-asc">Title: A to Z</option>
            </select>
          </div>

          <div class="filter-toggle">
            <label>
              <input v-model="filters.onlyActive" type="checkbox" />
              Show active listings only
            </label>
          </div>
        </div>

        <div class="filters-actions">
          <button class="reset-btn" @click="resetFilters">Reset filters</button>
          <button class="reset-btn reset-btn--primary" @click="runSearch" :disabled="isSearching">
            {{ isSearching ? 'Searching...' : 'Search' }}
          </button>
        </div>
      </section>

      <section v-if="successMsg" class="alert alert--success">{{ successMsg }}</section>
      <section v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</section>
      <section v-if="searchError" class="alert alert--error">{{ searchError }}</section>

      <section class="results-head">
        <div>
          <h2>{{ filteredListings.length }} stays</h2>
          <p>Results filtered according to your selected criteria.</p>
        </div>
      </section>

      <section v-if="filteredListings.length" class="listing-grid">
        <ListingCard
          v-for="listing in filteredListings"
          :key="listing.id"
          :listing="listing"
          :wallet-address="walletAddress"
          @reserve="handleReserve"
        />
      </section>

      <section v-else class="empty-state">
        <div class="empty-state__icon">⌕</div>
        <h3>No results found</h3>
        <p>Try broadening your filters or resetting your search.</p>
        <button class="reset-btn reset-btn--primary" @click="resetFilters">
          Show all listings
        </button>
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

.header-card,
.filters-card,
.empty-state {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.header-card {
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

.filter-group input,
.filter-group select {
  border: 1px solid #dddddd;
  border-radius: 16px;
  padding: 14px 16px;
  font: inherit;
  background: white;
}

.filter-toggle {
  display: flex;
  align-items: center;
  min-height: 48px;
}

.filter-toggle input {
  margin-right: 8px;
}

.filters-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.reset-btn {
  border: 1px solid var(--border);
  background: white;
  color: #111827;
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
}

.reset-btn--primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  border: 0;
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
}

.empty-state p {
  margin: 0 0 18px;
  color: var(--muted);
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

@media (max-width: 700px) {
  .filters-actions {
    flex-direction: column;
    justify-content: stretch;
  }

  .reset-btn {
    width: 100%;
  }
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
  .page {
    padding: 24px 14px 42px;
  }

  .filters-grid,
  .listing-grid {
    grid-template-columns: 1fr;
  }

  .filters-actions {
    justify-content: stretch;
  }

  .reset-btn {
    width: 100%;
  }
}
</style>
