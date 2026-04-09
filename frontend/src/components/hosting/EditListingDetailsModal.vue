<script setup>
import { ref, watch } from 'vue'
import { useListingDetails } from '@/composables/useListingDetails'
import { uploadImage } from '@/services/upload'

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
          <h2>Uredi detalje oglasa</h2>
          <p>{{ listing?.title || 'Oglas' }}</p>
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
          <input v-model="form.summary" type="text" placeholder="Kratki sažetak oglasa" />
        </div>

        <div class="form-group form-group--full">
          <label>Kratki opis</label>
          <textarea v-model="form.descriptionShort" rows="3"></textarea>
        </div>

        <div class="form-group form-group--full">
          <label>Puni opis</label>
          <textarea v-model="form.descriptionLong" rows="6"></textarea>
        </div>

        <div class="form-group">
          <label>Tip smještaja</label>
          <input v-model="form.propertyType" type="text" placeholder="Cijeli apartman" />
        </div>

        <div class="form-group">
          <label>Broj gostiju</label>
          <input v-model="form.guestCount" type="number" min="1" />
        </div>

        <div class="form-group">
          <label>Spavaće sobe</label>
          <input v-model="form.bedrooms" type="number" min="0" />
        </div>

        <div class="form-group">
          <label>Kreveti</label>
          <input v-model="form.beds" type="number" min="0" />
        </div>

        <div class="form-group">
          <label>Kupaonice</label>
          <input v-model="form.bathrooms" type="number" min="0" step="0.5" />
        </div>

        <div class="form-group form-group--full">
          <label>Highlights</label>
          <textarea
            v-model="form.highlightsText"
            rows="5"
            placeholder="Svaki red: Naslov::Opis"
          ></textarea>
        </div>

        <div class="form-group form-group--full">
          <label>Amenities</label>
          <textarea
            v-model="form.amenitiesText"
            rows="6"
            placeholder="Jedan sadržaj po retku"
          ></textarea>
        </div>

        <div class="form-group form-group--full">
          <label>Kućna pravila</label>
          <textarea
            v-model="form.houseRulesText"
            rows="5"
            placeholder="Jedno pravilo po retku"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Naslov lokacije</label>
          <input v-model="form.locationTitle" type="text" />
        </div>

        <div class="form-group form-group--full">
          <label>Opis lokacije</label>
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
      </div>

      <div class="sleeping-section">
        <div class="sleeping-section__top">
          <h3>Sleeping arrangements</h3>
          <button class="add-btn" @click="addSleepingArrangement">Dodaj sobu</button>
        </div>

        <div v-for="(room, index) in form.sleepingArrangements" :key="index" class="sleeping-row">
          <input v-model="room.title" type="text" placeholder="Naziv sobe" />
          <input v-model="room.subtitle" type="text" placeholder="Opis kreveta" />
          <input type="file" @change="(e) => handleRoomUpload(e, index)" />
          <img v-if="room.imageUrl" :src="room.imageUrl" class="room-preview" />
          <div v-if="uploadingRoomIndex === index">Uploading...</div>
          <button class="remove-btn" @click="removeSleepingArrangement(index)">Ukloni</button>
        </div>
      </div>

      <div class="details-modal__actions">
        <button class="secondary-btn" @click="$emit('close')">Odustani</button>
        <button class="primary-btn" @click="handleSave" :disabled="listingDetailsLoading">
          {{ listingDetailsLoading ? 'Spremanje...' : 'Spremi detalje' }}
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
