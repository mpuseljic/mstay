import { ref } from 'vue'
import {
  connectWallet,
  getMStayContract,
  createListing,
  fetchAllListings,
  makeReservation,
  fetchReservationsByGuest,
  fetchReservationsByHost,
  cancelReservationByGuest,
  cancelReservationByHost,
  releasePayout,
  fromWeiToEth,
  calculateReservationPrice,
} from '../services/web3'
import { syncListingsToBackend } from '../services/listingSync'

const walletAddress = ref('')
const listingCount = ref('')
const listings = ref([])
const myReservations = ref([])
const hostReservations = ref([])
const successMsg = ref('')
const errorMsg = ref('')

function formatDate(unix) {
  return new Date(Number(unix) * 1000).toLocaleDateString('hr-HR')
}

function normalizeImageUrls(item) {
  if (Array.isArray(item.imageUrls)) {
    return item.imageUrls
  }

  if (typeof item.imageUrls === 'string') {
    return item.imageUrls
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  }

  if (typeof item.imageUrl === 'string' && item.imageUrl.trim()) {
    return [item.imageUrl.trim()]
  }

  return []
}

async function connectCurrentWallet() {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    walletAddress.value = await connectWallet()
    successMsg.value = 'MetaMask je uspješno spojen.'

    await Promise.all([
      loadListingCount(),
      loadListings(),
      loadMyReservations(),
      loadHostReservations(),
    ])
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri spajanju MetaMaska.'
  }
}

async function loadListingCount() {
  try {
    const contract = await getMStayContract(false)
    const count = await contract.listingCount()
    listingCount.value = count.toString()
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju broja oglasa.'
  }
}

async function loadListings() {
  try {
    const data = await fetchAllListings()

    const mappedListings = data.map((item) => {
      const imageUrls = normalizeImageUrls(item)

      return {
        id: item.id.toString(),
        listingId: item.id.toString(),
        host: item.host,
        hostAddress: item.host,
        title: item.title || `Listing #${item.id.toString()}`,
        location: item.location || '',
        imageUrls,
        imageUrl: imageUrls[0] || '',
        pricePerNight: fromWeiToEth(item.pricePerNight),
        isActive: item.isActive,
      }
    })

    listings.value = mappedListings

    try {
      await syncListingsToBackend(mappedListings)
    } catch (err) {
      console.warn('Listing sync failed:', err)
    }
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju oglasa.'
  }
}

async function loadMyReservations() {
  try {
    if (!walletAddress.value) return

    const data = await fetchReservationsByGuest(walletAddress.value)

    myReservations.value = data.map((item) => ({
      id: item.id.toString(),
      listingId: item.listingId.toString(),
      guest: item.guest,
      checkInDate: formatDate(item.checkInDate),
      checkOutDate: formatDate(item.checkOutDate),
      nights: item.nights.toString(),
      totalPrice: fromWeiToEth(item.totalPrice),
      status: item.status.toString(),
    }))
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju rezervacija gosta.'
  }
}

async function loadHostReservations() {
  try {
    if (!walletAddress.value) return

    const data = await fetchReservationsByHost(walletAddress.value)

    hostReservations.value = data.map((item) => ({
      id: item.id.toString(),
      listingId: item.listingId.toString(),
      guest: item.guest,
      checkInDate: formatDate(item.checkInDate),
      checkOutDate: formatDate(item.checkOutDate),
      nights: item.nights.toString(),
      totalPrice: fromWeiToEth(item.totalPrice),
      status: item.status.toString(),
    }))
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju host rezervacija.'
  }
}

export function useMstay() {
  return {
    walletAddress,
    listingCount,
    listings,
    myReservations,
    hostReservations,
    successMsg,
    errorMsg,
    connectCurrentWallet,
    loadListingCount,
    loadListings,
    loadMyReservations,
    loadHostReservations,
    createListing,
    makeReservation,
    cancelReservationByGuest,
    cancelReservationByHost,
    releasePayout,
    calculateReservationPrice,
  }
}
