<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function openDetails() {
  router.push(`/listings/${props.listing.id}`)
}

const props = defineProps({
  listing: {
    type: Object,
    required: true,
  },
  walletAddress: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['reserve'])

function isOwnListing() {
  return (
    props.walletAddress && props.listing.host.toLowerCase() === props.walletAddress.toLowerCase()
  )
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
</script>

<template>
  <article class="card">
    <div class="card__image" @click="openDetails">
      <span class="card__image-badge">mStay</span>
    </div>

    <div class="card__body">
      <div class="card__top">
        <div>
          <h3 class="clickable-title" @click="openDetails">{{ listing.title }}</h3>
          <p>{{ listing.location }}</p>
        </div>

        <span :class="['badge', listing.isActive ? 'badge--success' : 'badge--muted']">
          {{ listing.isActive ? 'Aktivan' : 'Neaktivan' }}
        </span>
      </div>

      <div class="meta">
        <div class="meta__item">
          <span>ID</span>
          <strong>{{ listing.id }}</strong>
        </div>
        <div class="meta__item">
          <span>Po noći</span>
          <strong>{{ listing.pricePerNight }} ETH</strong>
        </div>
      </div>

      <p class="host">Domaćin: {{ shortenAddress(listing.host) }}</p>

      <button
        class="reserve-btn"
        @click="$emit('reserve', listing)"
        :disabled="!listing.isActive || isOwnListing()"
      >
        {{ isOwnListing() ? 'Vlastiti oglas' : 'Rezerviraj' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.card__image {
  height: 210px;
  background:
    linear-gradient(135deg, rgba(255, 56, 92, 0.16), rgba(255, 56, 92, 0.04)),
    linear-gradient(135deg, #f9fafb, #f3f4f6);
  display: flex;
  align-items: end;
  padding: 16px;
}

.card__image-badge {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 700;
}

.card__image {
  cursor: pointer;
}

.clickable-title {
  cursor: pointer;
}

.card__body {
  padding: 18px;
}

.card__top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.card__top h3 {
  margin: 0;
  font-size: 1.05rem;
}

.card__top p {
  margin: 6px 0 0;
  color: var(--muted);
}

.meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.meta__item {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 12px 14px;
}

.meta__item span {
  display: block;
  font-size: 0.82rem;
  color: var(--muted);
  margin-bottom: 6px;
}

.host {
  color: #4b5563;
  font-size: 0.92rem;
  margin: 0 0 16px;
}

.reserve-btn {
  width: 100%;
  border: 0;
  border-radius: 16px;
  padding: 14px 16px;
  background: #111827;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.reserve-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.badge {
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.badge--success {
  background: #dcfce7;
  color: #166534;
}

.badge--muted {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
