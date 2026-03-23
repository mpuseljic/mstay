<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '../components/layout/AppNavbar.vue'
import { useMstay } from '../composables/useMstay.js'
import AppFooter from '@/components/layout/AppFooter.vue'

const router = useRouter()

const {
  walletAddress,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadListings,
  loadListingCount,
  createListing,
} = useMstay()

const isSubmitting = ref(false)

const form = ref({
  title: '',
  location: '',
  pricePerNight: '',
})

async function handleSubmit() {
  try {
    if (!form.value.title || !form.value.location || !form.value.pricePerNight) return

    isSubmitting.value = true

    await createListing(form.value.title, form.value.location, Number(form.value.pricePerNight))

    await loadListings()
    await loadListingCount()

    router.push('/listings')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <section class="card">
        <div class="head">
          <div>
            <h1>Become a host</h1>
            <p>Objavi novi smještaj i učini ga dostupnim za rezervacije.</p>
          </div>
        </div>

        <section v-if="successMsg" class="alert alert--success">{{ successMsg }}</section>
        <section v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</section>

        <div class="form-grid">
          <div class="form-group">
            <label>Naslov</label>
            <input v-model="form.title" type="text" placeholder="Npr. Apartman Arena" />
          </div>

          <div class="form-group">
            <label>Lokacija</label>
            <input v-model="form.location" type="text" placeholder="Npr. Pula" />
          </div>

          <div class="form-group form-group--full">
            <label>Cijena po noćenju (ETH)</label>
            <input
              v-model="form.pricePerNight"
              type="number"
              min="0"
              step="0.01"
              placeholder="Npr. 0.12"
            />
          </div>
        </div>

        <button class="submit-btn" @click="handleSubmit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Objavljujem oglas...' : 'Objavi oglas' }}
        </button>
      </section>
      <AppFooter />
    </main>
  </div>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 28px;
  padding: 28px;
  box-shadow: var(--shadow);
}

.head {
  margin-bottom: 22px;
}

.head h1 {
  margin: 0 0 6px;
}

.head p {
  margin: 0;
  color: var(--muted);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group--full {
  grid-column: 1 / -1;
}

label {
  font-weight: 700;
}

input {
  border: 1px solid #dddddd;
  border-radius: 16px;
  padding: 14px 16px;
}

.submit-btn {
  width: 100%;
  margin-top: 20px;
  border: 0;
  border-radius: 16px;
  padding: 15px 16px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  font-weight: 700;
  cursor: pointer;
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
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
