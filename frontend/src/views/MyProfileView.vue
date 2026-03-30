<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppNavbar from '../components/layout/AppNavbar.vue'
import AppFooter from '../components/layout/AppFooter.vue'
import ReviewCard from '../components/reviews/ReviewCard.vue'
import { useMstay } from '../composables/useMstay'
import { useProfile } from '@/composables/useProfile'

const {
  walletAddress,
  successMsg,
  errorMsg,
  connectCurrentWallet,
  loadReviewsForUser,
  fetchReviewSummaryForUser,
} = useMstay()

const { profile, profileLoading, profileError, profileSuccess, loadProfile, updateProfile } =
  useProfile()

const myReviews = ref([])
const averageRating = ref(0)
const totalReviews = ref(0)
const isLoadingProfile = ref(false)

const form = ref({
  firstName: '',
  lastName: '',
  displayName: '',
  bio: '',
  location: '',
  jobTitle: '',
  languageText: '',
  about: '',
  avatarUrl: '',
})

const shortenedWallet = computed(() => {
  if (!walletAddress.value) return ''
  return `${walletAddress.value.slice(0, 6)}...${walletAddress.value.slice(-4)}`
})

const fullName = computed(() => {
  const displayName = form.value.displayName?.trim()
  if (displayName) return displayName

  return `${form.value.firstName || ''} ${form.value.lastName || ''}`.trim() || 'Nepoynati korisnik'
})

async function loadMyProfileData() {
  if (!walletAddress.value) {
    myReviews.value = []
    averageRating.value = 0
    totalReviews.value = 0
    return
  }

  myReviews.value = await loadReviewsForUser(walletAddress.value)

  const [avgScaled, count] = await fetchReviewSummaryForUser(walletAddress.value)
  averageRating.value = Number(avgScaled) / 10
  totalReviews.value = Number(count)

  const existingProfile = await loadProfile(walletAddress.value)

  if (existingProfile) {
    form.value = {
      firstName: existingProfile.firstName || '',
      lastName: existingProfile.lastName || '',
      displayName: existingProfile.displayName || '',
      bio: existingProfile.bio || '',
      location: existingProfile.location || '',
      jobTitle: existingProfile.jobTitle || '',
      languagesText: Array.isArray(existingProfile.languages)
        ? existingProfile.languages.join(', ')
        : '',
      about: existingProfile.about || '',
      avatarUrl: existingProfile.avatarUrl || '',
    }
  }
}

async function handleSaveProfile() {
  await updateProfile({
    walletAddress: walletAddress.value,
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    displayName: form.value.displayName,
    bio: form.value.bio,
    location: form.value.location,
    jobTitle: form.value.jobTitle,
    languages: form.value.languagesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
    about: form.value.about,
    avatarUrl: form.value.avatarUrl,
  })
}

const ratingLabel = computed(() => {
  if (!totalReviews.value) return 'Još nema recenzija'
  return `${averageRating.value.toFixed(1)} ★`
})

onMounted(async () => {
  await loadMyProfileData()
})

watch(
  () => walletAddress.value,
  async () => {
    await loadMyProfileData()
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <AppNavbar :wallet-address="walletAddress" @connect="connectCurrentWallet" />

    <main class="page">
      <section class="hero">
        <div class="hero__copy">
          <span class="eyebrow">User reputation</span>
          <h1>My Profile</h1>
          <p>
            Ovdje možeš vidjeti svoju reputaciju na mStay platformi, prosječnu ocjenu i sve
            recenzije koje su ti ostavili drugi korisnici.
          </p>
        </div>

        <div class="hero__stats">
          <div class="stat-card">
            <span class="stat-label">Wallet</span>
            <strong class="stat-value stat-value--wallet">
              {{ walletAddress ? shortenedWallet : 'Nije spojen' }}
            </strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Prosječna ocjena</span>
            <strong class="stat-value">
              {{ ratingLabel }}
            </strong>
          </div>

          <div class="stat-card">
            <span class="stat-label">Ukupno recenzija</span>
            <strong class="stat-value">
              {{ totalReviews }}
            </strong>
          </div>
        </div>
      </section>

      <section v-if="successMsg" class="alert alert--success">
        {{ successMsg }}
      </section>

      <section v-if="errorMsg" class="alert alert--error">
        {{ errorMsg }}
      </section>

      <section class="profile-layout">
        <div class="profile-preview-card">
          <div class="profile-avatar">
            <img
              v-if="form.avatarUrl"
              :src="form.avatarUrl"
              :alt="fullName"
              class="profile-avatar__img"
            />
            <div v-else class="profile-avatar__placeholder">
              {{ fullName.charAt(0).toUpperCase() }}
            </div>
          </div>

          <h3>{{ fullName }}</h3>
          <p class="profile-subtitle">
            {{ form.location || 'Lokacija nije unesena' }}
          </p>

          <div class="profile-mini-stats">
            <div class="profile-mini-stat">
              <span>Ocjena</span>
              <strong>{{ totalReviews ? `${averageRating.toFixed(1)} ★` : '—' }}</strong>
            </div>

            <div class="profile-mini-stat">
              <span>Recenzije</span>
              <strong>{{ totalReviews }}</strong>
            </div>
          </div>

          <p class="profile-bio-preview">
            {{ form.bio || 'Dodaj kratki bio kako bi drugi korisnici saznali više o tebi.' }}
          </p>
        </div>

        <div class="profile-edit-card">
          <h2>Uredi profil</h2>

          <section v-if="profileSuccess" class="alert alert--success">
            {{ profileSuccess }}
          </section>

          <section v-if="profileError" class="alert alert--error">
            {{ profileError }}
          </section>

          <div class="profile-form-grid">
            <div class="form-group">
              <label>Ime</label>
              <input v-model="form.firstName" type="text" placeholder="Npr. Mirna" />
            </div>

            <div class="form-group">
              <label>Prezime</label>
              <input v-model="form.lastName" type="text" placeholder="Npr. Pušeljić" />
            </div>

            <div class="form-group">
              <label>Prikazno ime</label>
              <input v-model="form.displayName" type="text" placeholder="Npr. Mirna" />
            </div>

            <div class="form-group">
              <label>Lokacija</label>
              <input v-model="form.location" type="text" placeholder="Npr. Zagreb, Hrvatska" />
            </div>

            <div class="form-group form-group--full">
              <label>Avatar URL</label>
              <input v-model="form.avatarUrl" type="text" placeholder="https://..." />
            </div>

            <div class="form-group">
              <label>Zanimanje</label>
              <input v-model="form.jobTitle" type="text" placeholder="Npr. Developer" />
            </div>

            <div class="form-group">
              <label>Jezici</label>
              <input v-model="form.languagesText" type="text" placeholder="Hrvatski, Engleski" />
            </div>

            <div class="form-group form-group--full">
              <label>Kratki bio</label>
              <textarea
                v-model="form.bio"
                rows="3"
                placeholder="Napiši kratko predstavljanje..."
              ></textarea>
            </div>

            <div class="form-group form-group--full">
              <label>O meni</label>
              <textarea
                v-model="form.about"
                rows="5"
                placeholder="Napiši nešto više o sebi..."
              ></textarea>
            </div>
          </div>

          <button class="save-profile-btn" @click="handleSaveProfile" :disabled="profileLoading">
            {{ profileLoading ? 'Spremanje...' : 'Spremi profil' }}
          </button>
        </div>
      </section>

      <section class="section-head">
        <div>
          <h2>Reviews about you</h2>
          <p>Recenzije koje su ti ostavili domaćini ili gosti na platformi.</p>
        </div>
      </section>

      <section v-if="isLoadingProfile" class="empty-state">
        <div class="empty-state__icon">⏳</div>
        <h3>Učitavanje profila...</h3>
        <p>Pričekaj trenutak dok dohvatimo tvoje podatke i recenzije.</p>
      </section>

      <section v-else-if="!walletAddress" class="empty-state">
        <div class="empty-state__icon">👤</div>
        <h3>Spoji wallet za pregled profila</h3>
        <p>Za prikaz reputacije i recenzija potrebno je spojiti MetaMask wallet.</p>
      </section>

      <section v-else-if="myReviews.length === 0" class="empty-state">
        <div class="empty-state__icon">⭐</div>
        <h3>Još nemaš recenzija</h3>
        <p>
          Kada drugi korisnici ostave recenziju o tebi, ovdje će se prikazati sve povratne
          informacije.
        </p>
      </section>

      <section v-else class="reviews-grid">
        <ReviewCard v-for="review in myReviews" :key="review.id" :review="review" />
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
  grid-template-columns: 1fr;
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

.stat-value--wallet {
  font-size: 1.15rem;
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

.reviews-grid {
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
  margin: 0 auto;
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

.profile-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 22px;
  margin-bottom: 28px;
}

.profile-preview-card,
.profile-edit-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.profile-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 16px;
  background: #f3f4f6;
}

.profile-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 2rem;
  font-weight: 800;
  color: #374151;
  background:
    linear-gradient(135deg, rgba(255, 56, 92, 0.16), rgba(255, 56, 92, 0.04)),
    linear-gradient(135deg, #f9fafb, #f3f4f6);
}

.profile-preview-card h3 {
  margin: 0 0 6px;
  font-size: 1.6rem;
}

.profile-subtitle {
  margin: 0 0 16px;
  color: var(--muted);
}

.profile-mini-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.profile-mini-stat {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 14px;
}

.profile-mini-stat span {
  display: block;
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.profile-bio-preview {
  color: #4b5563;
  line-height: 1.7;
}

.profile-edit-card h2 {
  margin: 0 0 16px;
}

.profile-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.form-group label {
  font-weight: 700;
  color: #374151;
}

.form-group input,
.form-group textarea {
  border: 1px solid #dddddd;
  border-radius: 16px;
  padding: 14px 16px;
  font: inherit;
}

.save-profile-btn {
  margin-top: 18px;
  border: 0;
  border-radius: 16px;
  padding: 14px 18px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 1100px) {
  .profile-layout,
  .reviews-grid,
  .hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .profile-form-grid,
  .profile-mini-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .hero,
  .reviews-grid {
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
}
</style>
