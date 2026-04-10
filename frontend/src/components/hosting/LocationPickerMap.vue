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
})

const emit = defineEmits(['update:latitude', 'update:longitude'])

const mapEl = ref(null)
let map = null
let marker = null

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function hasCoordinates() {
  const lat = Number(props.latitude)
  const lng = Number(props.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng)
}

function getInitialCenter() {
  if (hasCoordinates()) {
    return [Number(props.latitude), Number(props.longitude)]
  }

  return [45.815, 15.9819] // Zagreb fallback
}

function placeMarker(lat, lng) {
  if (!map) return

  if (marker) {
    marker.setLatLng([lat, lng])
  } else {
    marker = L.marker([lat, lng]).addTo(map)
  }
}

function initMap() {
  if (!mapEl.value) return

  const center = getInitialCenter()

  map = L.map(mapEl.value, {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView(center, hasCoordinates() ? 14 : 7)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  if (hasCoordinates()) {
    placeMarker(Number(props.latitude), Number(props.longitude))
  }

  map.on('click', (e) => {
    const lat = Number(e.latlng.lat.toFixed(6))
    const lng = Number(e.latlng.lng.toFixed(6))

    placeMarker(lat, lng)

    emit('update:latitude', lat)
    emit('update:longitude', lng)
  })
}

function destroyMap() {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
}

watch(
  () => [props.latitude, props.longitude],
  ([lat, lng]) => {
    if (!map) return

    const parsedLat = Number(lat)
    const parsedLng = Number(lng)

    if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
      placeMarker(parsedLat, parsedLng)
      map.setView([parsedLat, parsedLng], 14)
    }
  },
)

onMounted(() => {
  initMap()
})

onBeforeUnmount(() => {
  destroyMap()
})
</script>

<template>
  <div class="picker-map-wrap">
    <div ref="mapEl" class="picker-map"></div>
    <p class="picker-map__note">Klikni na mapu kako bi postavila točnu lokaciju smještaja.</p>
  </div>
</template>

<style scoped>
.picker-map-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.picker-map {
  width: 100%;
  height: 360px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.picker-map__note {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
}
</style>
