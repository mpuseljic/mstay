<script setup>
const props = defineProps({
  profile: {
    type: Object,
    default: null,
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  hostWallet: {
    type: String,
    default: '',
  },
})

function shortenAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function fullName(profile) {
  if (!profile) return ''
  if (profile.displayName) return profile.displayName

  const full = `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
  return full || 'Domaćin'
}
</script>

<template>
  <section class="host-profile-card">
    <h2>Upoznajte svog domaćina</h2>

    <div class="host-profile-layout">
      <div class="host-profile-left">
        <div class="host-avatar">
          <img
            v-if="profile?.avatarUrl"
            :src="profile.avatarUrl"
            :alt="fullName(profile)"
            class="host-avatar__img"
          />
          <div v-else class="host-avatar__placeholder">
            {{ fullName(profile).charAt(0).toUpperCase() }}
          </div>
        </div>

        <h3>{{ profile ? fullName(profile) : shortenAddress(hostWallet) }}</h3>
        <p class="host-wallet">{{ shortenAddress(hostWallet) }}</p>

        <div class="host-stats">
          <div class="host-stat">
            <strong>{{ totalReviews }}</strong>
            <span>recenzije</span>
          </div>

          <div class="host-stat">
            <strong>{{ totalReviews ? `${averageRating.toFixed(1)} ★` : '—' }}</strong>
            <span>ocjena</span>
          </div>
        </div>
      </div>

      <div class="host-profile-right">
        <p v-if="profile?.bio" class="host-bio">
          {{ profile.bio }}
        </p>

        <div class="host-meta">
          <p v-if="profile?.location"><strong>Lokacija:</strong> {{ profile.location }}</p>
          <p v-if="profile?.jobTitle"><strong>Zanimanje:</strong> {{ profile.jobTitle }}</p>
          <p v-if="profile?.languages?.length">
            <strong>Jezici:</strong> {{ profile.languages.join(', ') }}
          </p>
        </div>

        <p v-if="profile?.about" class="host-about">
          {{ profile.about }}
        </p>

        <p v-if="!profile" class="host-fallback">Profil domaćina još nije uređen.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.host-profile-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.host-profile-card h2 {
  margin: 0 0 18px;
}

.host-profile-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 22px;
}

.host-profile-left {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 22px;
  padding: 20px;
}

.host-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 14px;
  background: #f3f4f6;
}

.host-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.host-avatar__placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 1.8rem;
  font-weight: 800;
  color: #374151;
  background:
    linear-gradient(135deg, rgba(255, 56, 92, 0.16), rgba(255, 56, 92, 0.04)),
    linear-gradient(135deg, #f9fafb, #f3f4f6);
}

.host-profile-left h3 {
  margin: 0 0 6px;
  font-size: 1.5rem;
}

.host-wallet {
  margin: 0 0 16px;
  color: var(--muted);
}

.host-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.host-stat {
  background: white;
  border: 1px solid #ededed;
  border-radius: 16px;
  padding: 14px;
}

.host-stat strong {
  display: block;
  font-size: 1.2rem;
  margin-bottom: 4px;
}

.host-stat span {
  color: var(--muted);
  font-size: 0.85rem;
}

.host-bio,
.host-about {
  color: #4b5563;
  line-height: 1.75;
}

.host-bio {
  margin: 0 0 16px;
  font-weight: 600;
}

.host-meta {
  margin-bottom: 16px;
}

.host-meta p {
  margin: 0 0 8px;
  color: #374151;
}

.host-fallback {
  color: var(--muted);
}

@media (max-width: 900px) {
  .host-profile-layout {
    grid-template-columns: 1fr;
  }
}
</style>
