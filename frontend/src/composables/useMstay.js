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

async function connectCurrentWallet() {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    walletAddress.value = await connectWallet()
    successMsg.value = 'MetaMask je uspješno spojen.'
    await Promise.all([loadMyReservations(), loadHostReservations()])
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
    listings.value = data.map((item) => ({
      id: item.id.toString(),
      host: item.host,
      title: item.title,
      location: item.location,
      pricePerNight: fromWeiToEth(item.pricePerNight),
      isActive: item.isActive,
    }))
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
