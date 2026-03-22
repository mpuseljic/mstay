<script setup>
const props = defineProps({
  reservation: {
    type: Object,
    required: true,
  },
  mode: {
    type: String,
    default: 'guest',
  },
})

const emit = defineEmits(['guest-cancel', 'host-cancel', 'host-payout'])

function getStatusLabel(status) {
  switch (String(status)) {
    case '0':
      return 'Aktivna'
    case '1':
      return 'Otkazana od gosta'
    case '2':
      return 'Otkazana od domaćina'
    case '3':
      return 'Isplaćeno domaćinu'
    case '4':
      return 'Refundirano'
    default:
      return 'Nepoznato'
  }
}

function getStatusClass(status) {
  switch (String(status)) {
    case '0':
      return 'badge badge--active'
    case '1':
    case '2':
    case '4':
      return 'badge badge--danger'
    case '3':
      return 'badge badge--success'
    default:
      return 'badge'
  }
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
</script>

<template>
  <article class="card">
    <div class="top">
      <h3>Rezervacija #{{ reservation.id }}</h3>
      <span :class="getStatusClass(reservation.status)">
        {{ getStatusLabel(reservation.status) }}
      </span>
    </div>

    <div class="details">
      <p><strong>ID oglasa:</strong> {{ reservation.listingId }}</p>
      <p v-if="mode === 'host'"><strong>Gost:</strong> {{ shortenAddress(reservation.guest) }}</p>
      <p><strong>Check-in:</strong> {{ reservation.checkInDate }}</p>
      <p><strong>Check-out:</strong> {{ reservation.checkOutDate }}</p>
      <p><strong>Noćenja:</strong> {{ reservation.nights }}</p>
      <p><strong>Ukupna cijena:</strong> {{ reservation.totalPrice }} ETH</p>
    </div>

    <div class="actions">
      <button
        v-if="mode === 'guest' && reservation.status === '0'"
        class="btn btn--danger"
        @click="$emit('guest-cancel', reservation.id)"
      >
        Otkaži kao gost
      </button>

      <template v-if="mode === 'host' && reservation.status === '0'">
        <button class="btn btn--danger" @click="$emit('host-cancel', reservation.id)">
          Otkaži kao domaćin
        </button>
        <button class="btn btn--success" @click="$emit('host-payout', reservation.id)">
          Isplati domaćinu
        </button>
      </template>
    </div>
  </article>
</template>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 18px;
  box-shadow: var(--shadow);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
  margin-bottom: 12px;
}

.top h3 {
  margin: 0;
  font-size: 1.02rem;
}

.details p {
  margin: 8px 0;
  color: #374151;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.btn {
  border: 0;
  border-radius: 14px;
  padding: 12px 14px;
  font-weight: 700;
  color: white;
  cursor: pointer;
}

.btn--danger {
  background: var(--danger);
}

.btn--success {
  background: var(--success);
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

.badge--danger {
  background: #fee2e2;
  color: #b91c1c;
}

.badge--active {
  background: #fff7ed;
  color: #c2410c;
}
</style>
