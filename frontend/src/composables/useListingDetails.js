import { ref } from 'vue'
import { fetchListingDetails, saveListingDetails } from '../services/listingDetails'

const listingDetails = ref(null)
const listingDetailsLoading = ref(false)
const listingDetailsError = ref('')
const listingDetailsSuccess = ref('')

export function useListingDetails() {
  async function loadListingDetails(listingId) {
    try {
      listingDetailsLoading.value = true
      listingDetailsError.value = ''
      const result = await fetchListingDetails(listingId)
      listingDetails.value = result
      return result
    } catch (err) {
      listingDetailsError.value = err.message || 'Greška pri dohvaćanju detalja oglasa.'
      listingDetails.value = null
      return null
    } finally {
      listingDetailsLoading.value = false
    }
  }

  async function updateListingDetails(payload) {
    try {
      listingDetailsLoading.value = true
      listingDetailsError.value = ''
      listingDetailsSuccess.value = ''

      const result = await saveListingDetails(payload)
      listingDetails.value = result
      listingDetailsSuccess.value = 'Detalji oglasa su uspješno spremljeni.'
      return result
    } catch (err) {
      listingDetailsError.value = err.message || 'Greška pri spremanju detalja oglasa.'
      throw err
    } finally {
      listingDetailsLoading.value = false
    }
  }

  return {
    listingDetails,
    listingDetailsLoading,
    listingDetailsError,
    listingDetailsSuccess,
    loadListingDetails,
    updateListingDetails,
  }
}
