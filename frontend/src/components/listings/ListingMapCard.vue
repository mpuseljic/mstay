<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  latitude: {
    type: [Number, String, null],
    default: null,
  },
  longitude: {
    type: [Number, String, null],
    default: null,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
})

const mapEl = ref(null)
let map = null
let marker = null

function hasValidCoordinates() {
  const lat = Number(props.latitude)
  const lng = Number(props.longitude)

  return Number.isFinite(lat) && Number.isFinite(lng)
}

function initMap() {
  if (!mapEl.value || !hasValidCoordinates()) return

  const lat = Number(props.latitude)
  const lng = Number(props.longitude)

  map = L.map(mapEl.value, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView([lat, lng], 14)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  marker = L.marker([lat, lng]).addTo(map)

  const popupHtml = `
    <div style="min-width:180px">
      <strong>${props.title || 'Lokacija smještaja'}</strong>
      <div style="margin-top:6px">${props.description || ''}</div>
    </div>
  `

  marker.bindPopup(popupHtml)
}

function destroyMap() {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
}

function resetMap() {
  destroyMap()
  initMap()
}

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  destroyMap()
})

watch(
  () => [props.latitude, props.longitude],
  () => {
    resetMap()
  },
)
</script>

<template>
  <section class="map-card">
    <h2>Where you’ll be</h2>

    <div v-if="hasValidCoordinates()" ref="mapEl" class="map-box"></div>

    <div v-else class="map-fallback">
      <div class="map-fallback__icon">📍</div>
      <h3>Exact location provided after booking</h3>
      <p>
        For privacy and security, the precise address will be shared once your reservation is
        confirmed.
      </p>
    </div>
  </section>
</template>

<style scoped>
.map-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: var(--shadow);
}

.map-card h2 {
  margin: 0 0 18px;
}

.map-box {
  width: 100%;
  height: 420px;
  border-radius: 20px;
  overflow: hidden;
}

.map-fallback {
  border: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 20px;
  padding: 36px 20px;
  text-align: center;
}

.map-fallback__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 14px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff1f3;
  font-size: 1.5rem;
}

.map-fallback h3 {
  margin: 0 0 8px;
}

.map-fallback p {
  margin: 0;
  color: var(--muted);
}
</style>
