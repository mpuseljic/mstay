import { ref } from 'vue'
import {
  connectWallet,
  getMStayCoreContract,
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
  checkDateAvailability,
  leaveReview,
  fetchReviewsForUser,
  hasGuestLeftReview,
  hasHostLeftReview,
  fetchReviewSummaryForUser,
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

function formatDateTime(unix) {
  return new Date(Number(unix) * 1000).toLocaleString('hr-HR')
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
    const contract = await getMStayCoreContract(false)
    const count = await contract.listingCount()
    listingCount.value = count.toString()
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju broja oglasa.'
  }
}

async function loadListings() {
  try {
    const data = await fetchAllListings()

    const mappedListings = await Promise.all(
      data.map(async (item) => {
        let averageRating = 0
        let totalReviews = 0

        try {
          const [averageRatingScaled, reviewCount] = await fetchReviewSummaryForUser(item.host)
          averageRating = Number(averageRatingScaled) / 10
          totalReviews = Number(reviewCount)
        } catch {
          averageRating = 0
          totalReviews = 0
        }

        return {
          id: item.id.toString(),
          host: item.host,
          title: item.title,
          location: item.location,
          imageUrls: item.imageUrls || [],
          imageUrl: item.imageUrls?.[0] || '',
          pricePerNight: fromWeiToEth(item.pricePerNight),
          isActive: item.isActive,
          averageRating,
          totalReviews,
        }
      }),
    )

    listings.value = mappedListings
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
      checkInTimestamp: Number(item.checkInDate),
      checkOutTimestamp: Number(item.checkOutDate),
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
      checkInTimestamp: Number(item.checkInDate),
      checkOutTimestamp: Number(item.checkOutDate),
      nights: item.nights.toString(),
      totalPrice: fromWeiToEth(item.totalPrice),
      status: item.status.toString(),
    }))
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju host rezervacija.'
  }
}

async function loadReviewsForUser(userAddress) {
  try {
    const data = await fetchReviewsForUser(userAddress)

    return data.map((item) => ({
      id: item.id.toString(),
      reservationId: item.reservationId.toString(),
      reviewer: item.reviewer,
      reviewedUser: item.reviewedUser,
      rating: Number(item.rating),
      comment: item.comment,
      forHost: item.forHost,
      createdAt: formatDateTime(item.createdAt),
    }))
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju recenzija.'
    return []
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
    loadReviewsForUser,
    createListing,
    makeReservation,
    cancelReservationByGuest,
    cancelReservationByHost,
    releasePayout,
    calculateReservationPrice,
    checkDateAvailability,
    leaveReview,
    hasGuestLeftReview,
    hasHostLeftReview,
    fetchReviewSummaryForUser,
  }
}
