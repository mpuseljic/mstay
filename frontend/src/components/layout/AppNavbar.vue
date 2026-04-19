<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useMstay } from '@/composables/useMstay'

const props = defineProps({
  walletAddress: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['connect'])

const route = useRoute()
const { tokenBalance, loadTokenBalance } = useMstay()

const shortWallet = computed(() => {
  if (!props.walletAddress) return 'Spoji MetaMask'
  return `${props.walletAddress.slice(0, 6)}...${props.walletAddress.slice(-4)}`
})

function isActive(path) {
  return route.path === path
}

onMounted(() => {
  if (props.walletAddress) {
    loadTokenBalance()
  }
})
</script>

<template>
  <header class="navbar">
    <div class="navbar__inner">
      <RouterLink to="/" class="brand">
        <div class="brand__logo">m</div>
        <div>
          <div class="brand__title">mStay</div>
          <div class="brand__subtitle">On-chain stays</div>
        </div>
      </RouterLink>

      <nav class="nav">
        <RouterLink :class="['nav__link', { 'nav__link--active': isActive('/') }]" to="/">
          Home
        </RouterLink>
        <RouterLink
          :class="['nav__link', { 'nav__link--active': isActive('/listings') }]"
          to="/listings"
        >
          Listings
        </RouterLink>
        <RouterLink
          :class="['nav__link', { 'nav__link--active': isActive('/create-listing') }]"
          to="/create-listing"
        >
          Host
        </RouterLink>
        <RouterLink
          :class="['nav__link', { 'nav__link--active': isActive('/my-trips') }]"
          to="/my-trips"
        >
          My Trips
        </RouterLink>
        <RouterLink
          :class="['nav__link', { 'nav__link--active': isActive('/my-hosting') }]"
          to="/my-hosting"
        >
          My Hosting
        </RouterLink>

        <RouterLink
          :class="['nav__link', { 'nav__link--active': isActive('/my-profile') }]"
          to="/my-profile"
        >
          My Profile
        </RouterLink>
      </nav>

      <div class="navbar__actions">
        <div v-if="props.walletAddress" class="mst-badge">
          MST: {{ Number(tokenBalance).toFixed(2) }}
        </div>

        <button class="wallet-btn" @click="$emit('connect')">
          {{ shortWallet }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.navbar__inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 18px;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand__logo {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: white;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  box-shadow: 0 12px 24px rgba(255, 56, 92, 0.22);
}

.brand__title {
  font-weight: 800;
}

.brand__subtitle {
  font-size: 0.88rem;
  color: var(--muted);
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.nav__link {
  padding: 10px 14px;
  border-radius: 999px;
  color: #4b5563;
  font-weight: 600;
}

.nav__link--active {
  background: #fff1f3;
  color: var(--primary);
}

.wallet-btn {
  border: 0;
  border-radius: 999px;
  padding: 12px 16px;
  background: #111827;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.navbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mst-badge {
  border-radius: 999px;
  padding: 10px 14px;
  background: #fff7ed;
  color: #9a3412;
  font-weight: 800;
  border: 1px solid #fed7aa;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .navbar__actions {
    flex-direction: column;
    width: 100%;
  }

  .mst-badge,
  .wallet-btn {
    width: 100%;
    text-align: center;
  }
}

@media (max-width: 980px) {
  .navbar__inner {
    flex-direction: column;
    align-items: stretch;
  }

  .nav {
    justify-content: center;
  }

  .wallet-btn {
    width: 100%;
  }
}
</style>
