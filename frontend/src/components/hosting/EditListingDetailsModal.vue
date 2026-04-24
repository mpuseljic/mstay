<script setup>
import { ref, watch } from 'vue'
import { useListingDetails } from '@/composables/useListingDetails'
import { uploadImage } from '@/services/upload'
import LocationPickerMap from './LocationPickerMap.vue'
import { geocodeLocation } from '@/services/geocode'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  listing: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'saved'])
const geocodeQuery = ref('')
const isGeocoding = ref(false)
const geocodeError = ref('')

const {
  loadListingDetails,
  updateListingDetails,
  listingDetailsLoading,
  listingDetailsError,
  listingDetailsSuccess,
} = useListingDetails()

const form = ref({
  listingId: null,
  summary: '',
  descriptionShort: '',
  descriptionLong: '',
  propertyType: '',
  guestCount: 1,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  highlightsText: '',
  amenitiesText: '',
  houseRulesText: '',
  locationTitle: '',
  locationDescription: '',
  latitude: '',
  longitude: '',
  sleepingArrangements: [{ title: '', subtitle: '', imageUrl: '' }],
})

const uploadingRoomIndex = ref(null)

function createDefaultForm(listing) {
  return {
    listingId: listing?.id ? Number(listing.id) : null,
    summary: '',
    descriptionShort: '',
    descriptionLong: '',
    propertyType: '',
    guestCount: 1,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    highlightsText: '',
    amenitiesText: '',
    houseRulesText: '',
    locationTitle: listing?.location || '',
    locationDescription: '',
    latitude: '',
    longitude: '',
    sleepingArrangements: [{ title: '', subtitle: '', imageUrl: '' }],
  }
}

function mapDetailsToForm(details, listing) {
  if (!details) return createDefaultForm(listing)

  return {
    listingId: Number(details.listingId),
    summary: details.summary || '',
    descriptionShort: details.descriptionShort || '',
    descriptionLong: details.descriptionLong || '',
    propertyType: details.propertyType || '',
    guestCount: Number(details.guestCount || 1),
    bedrooms: Number(details.bedrooms || 1),
    beds: Number(details.beds || 1),
    bathrooms: Number(details.bathrooms || 1),
    highlightsText: Array.isArray(details.highlights)
      ? details.highlights.map((x) => `${x.title}::${x.description}`).join('\n')
      : '',
    amenitiesText: Array.isArray(details.amenities) ? details.amenities.join('\n') : '',
    houseRulesText: Array.isArray(details.houseRules) ? details.houseRules.join('\n') : '',
    locationTitle: details.locationTitle || listing?.location || '',
    locationDescription: details.locationDescription || '',
    latitude: details.latitude ?? '',
    longitude: details.longitude ?? '',
    sleepingArrangements:
      Array.isArray(details.sleepingArrangements) && details.sleepingArrangements.length
        ? details.sleepingArrangements.map((x) => ({
            title: x.title || '',
            subtitle: x.subtitle || '',
            imageUrl: x.imageUrl || '',
          }))
        : [{ title: '', subtitle: '', imageUrl: '' }],
  }
}

async function loadFormData() {
  if (!props.listing?.id) return
  const details = await loadListingDetails(Number(props.listing.id))
  form.value = mapDetailsToForm(details, props.listing)
}

function addSleepingArrangement() {
  form.value.sleepingArrangements.push({
    title: '',
    subtitle: '',
    imageUrl: '',
  })
}

function removeSleepingArrangement(index) {
  form.value.sleepingArrangements.splice(index, 1)
  if (!form.value.sleepingArrangements.length) {
    addSleepingArrangement()
  }
}

function parseHighlights(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, description] = line.split('::')
      return {
        title: String(title || '').trim(),
        description: String(description || '').trim(),
      }
    })
    .filter((x) => x.title)
}

function parseLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

async function handleGeocode() {
  if (!geocodeQuery.value.trim()) return

  try {
    isGeocoding.value = true
    geocodeError.value = ''

    const result = await geocodeLocation(geocodeQuery.value)

    form.value.latitude = result.latitude
    form.value.longitude = result.longitude

    if (!form.value.locationTitle) {
      form.value.locationTitle = result.displayName
    }
  } catch (err) {
    geocodeError.value = err.message || 'Greška kod pronalaska lokacije.'
  } finally {
    isGeocoding.value = false
  }
}

async function handleSave() {
  await updateListingDetails({
    listingId: form.value.listingId,
    summary: form.value.summary,
    descriptionShort: form.value.descriptionShort,
    descriptionLong: form.value.descriptionLong,
    propertyType: form.value.propertyType,
    guestCount: Number(form.value.guestCount || 0),
    bedrooms: Number(form.value.bedrooms || 0),
    beds: Number(form.value.beds || 0),
    bathrooms: Number(form.value.bathrooms || 0),
    highlights: parseHighlights(form.value.highlightsText),
    amenities: parseLines(form.value.amenitiesText),
    houseRules: parseLines(form.value.houseRulesText),
    locationTitle: form.value.locationTitle,
    locationDescription: form.value.locationDescription,
    latitude: form.value.latitude === '' ? null : Number(form.value.latitude),
    longitude: form.value.longitude === '' ? null : Number(form.value.longitude),
    sleepingArrangements: form.value.sleepingArrangements
      .map((x) => ({
        title: String(x.title || '').trim(),
        subtitle: String(x.subtitle || '').trim(),
        imageUrl: String(x.imageUrl || '').trim(),
      }))
      .filter((x) => x.title || x.subtitle || x.imageUrl),
  })

  emit('saved')
  emit('close')
}

async function handleRoomUpload(e, index) {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    uploadingRoomIndex.value = index

    const url = await uploadImage(file)

    form.value.sleepingArrangements[index].imageUrl = url
  } catch (err) {
    alert('Greška kod upload-a slike.')
  } finally {
    uploadingRoomIndex.value = null
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      form.value = createDefaultForm(props.listing)
      await loadFormData()
    }
  },
)
</script>

<template>
  <div v-if="open" class="details-modal" @click.self="$emit('close')">
    <div class="details-modal__dialog">
      <div class="details-modal__top">
        <div>
          <h2>Edit listing details</h2>
          <p>{{ listing?.title || 'Listing' }}</p>
        </div>
        <button class="details-modal__close" @click="$emit('close')">✕</button>
      </div>

      <section v-if="listingDetailsError" class="alert alert--error">
        {{ listingDetailsError }}
      </section>

      <section v-if="listingDetailsSuccess" class="alert alert--success">
        {{ listingDetailsSuccess }}
      </section>

      <div class="form-grid">
        <div class="form-group form-group--full">
          <label>Summary</label>
          <input v-model="form.summary" type="text" placeholder="Short listing summary" />
        </div>

        <div class="form-group form-group--full">
          <label>Short description</label>
          <textarea v-model="form.descriptionShort" rows="3"></textarea>
        </div>

        <div class="form-group form-group--full">
          <label>Full description</label>
          <textarea v-model="form.descriptionLong" rows="6"></textarea>
        </div>

        <div class="form-group">
          <label>Property type</label>
          <input v-model="form.propertyType" type="text" placeholder="Entire apartment" />
        </div>

        <div class="form-group">
          <label>Guests</label>
          <input v-model="form.guestCount" type="number" min="1" />
        </div>

        <div class="form-group">
          <label>Bedrooms</label>
          <input v-model="form.bedrooms" type="number" min="0" />
        </div>

        <div class="form-group">
          <label>Beds</label>
          <input v-model="form.beds" type="number" min="0" />
        </div>

        <div class="form-group">
          <label>Bathrooms</label>
          <input v-model="form.bathrooms" type="number" min="0" step="0.5" />
        </div>

        <div class="form-group form-group--full">
          <label>Highlights</label>
          <textarea
            v-model="form.highlightsText"
            rows="5"
            placeholder="Each line: Title::Description"
          ></textarea>
        </div>

        <div class="form-group form-group--full">
          <label>Amenities</label>
          <textarea
            v-model="form.amenitiesText"
            rows="6"
            placeholder="One amenity per line"
          ></textarea>
        </div>

        <div class="form-group form-group--full">
          <label>House rules</label>
          <textarea
            v-model="form.houseRulesText"
            rows="5"
            placeholder="One rule per line"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Location title</label>
          <input v-model="form.locationTitle" type="text" />
        </div>

        <div class="form-group form-group--full">
          <label>Location description</label>
          <textarea v-model="form.locationDescription" rows="4"></textarea>
        </div>

        <div class="form-group">
          <label>Latitude</label>
          <input v-model="form.latitude" type="number" step="0.000001" />
        </div>

        <div class="form-group">
          <label>Longitude</label>
          <input v-model="form.longitude" type="number" step="0.000001" />
        </div>

        <div class="form-group form-group--full">
          <label>Address or location</label>

          <div class="geocode-row">
            <input
              v-model="geocodeQuery"
              type="text"
              placeholder="e.g. Ilica 1, Zagreb or Budapest, Hungary"
            />
            <button class="secondary-btn" @click="handleGeocode" :disabled="isGeocoding">
              {{ isGeocoding ? 'Searching...' : 'Find location' }}
            </button>
          </div>

          <p v-if="geocodeError" class="geocode-error">
            {{ geocodeError }}
          </p>
        </div>

        <div class="form-group form-group--full">
          <label>Select location on map</label>

          <LocationPickerMap
            :latitude="form.latitude"
            :longitude="form.longitude"
            @update:latitude="form.latitude = $event"
            @update:longitude="form.longitude = $event"
          ></LocationPickerMap>
        </div>
      </div>

      <div class="sleeping-section">
        <div class="sleeping-section__top">
          <h3>Sleeping arrangements</h3>
          <button class="add-btn" @click="addSleepingArrangement">Add room</button>
        </div>

        <div v-for="(room, index) in form.sleepingArrangements" :key="index" class="sleeping-row">
          <input v-model="room.title" type="text" placeholder="Room name" />
          <input v-model="room.subtitle" type="text" placeholder="Bed description" />
          <input type="file" @change="(e) => handleRoomUpload(e, index)" />
          <img v-if="room.imageUrl" :src="room.imageUrl" class="room-preview" />
          <div v-if="uploadingRoomIndex === index">Uploading...</div>
          <button class="remove-btn" @click="removeSleepingArrangement(index)">Remove</button>
        </div>
      </div>

      <div class="details-modal__actions">
        <button class="secondary-btn" @click="$emit('close')">Cancel</button>
        <button class="primary-btn" @click="handleSave" :disabled="listingDetailsLoading">
          {{ listingDetailsLoading ? 'Saving...' : 'Save details' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.details-modal {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.42);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.details-modal__dialog {
  width: min(1100px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: white;
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.18);
}
.details-modal__top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}
.details-modal__close {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  font-size: 1.15rem;
}
.form-grid {
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
}
.form-group input,
.form-group textarea {
  border: 1px solid #dddddd;
  border-radius: 16px;
  padding: 14px 16px;
  font: inherit;
}
.sleeping-section {
  margin-top: 24px;
}
.sleeping-section__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.sleeping-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.3fr auto;
  gap: 12px;
  margin-bottom: 12px;
}
.add-btn,
.remove-btn,
.secondary-btn,
.primary-btn {
  border: 0;
  border-radius: 14px;
  padding: 12px 16px;
  font-weight: 700;
  cursor: pointer;
}
.add-btn,
.secondary-btn {
  background: #f3f4f6;
  color: #111827;
}
.primary-btn {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
}
.remove-btn {
  background: #fee2e2;
  color: #b91c1c;
}
.details-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
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

.room-preview {
  width: 100%;
  max-width: 160px;
  border-radius: 12px;
  margin-top: 6px;
}

.geocode-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}

.geocode-error {
  margin: 8px 0 0;
  color: #b91c1c;
  font-size: 0.92rem;
}

@media (max-width: 900px) {
  .geocode-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .form-grid,
  .sleeping-row {
    grid-template-columns: 1fr;
  }
  .details-modal__actions {
    flex-direction: column;
  }
}
</style>
