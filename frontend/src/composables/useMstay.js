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
  fetchReservationsByListing,
  makeReservationWithDiscount,
  fetchTokenBalance,
  approveDiscountTokens,
  hasEthereumProvider,
  getMetaMaskDownloadUrl,
  getConnectedAccounts,
  getCurrentChainId,
  switchToChain,
} from '../services/web3'

const walletAddress = ref('')
const listingCount = ref('')
const listings = ref([])
const myReservations = ref([])
const hostReservations = ref([])
const successMsg = ref('')
const errorMsg = ref('')
const tokenBalance = ref('0')

const isMetaMaskInstalled = ref(false)
const isCorrectNetwork = ref(true)
const currentChainId = ref('')
const requiredChainId = ref('0x7a69') // Hardhat 31337
const onboardingMsg = ref('')

function formatDate(unix) {
  return new Date(Number(unix) * 1000).toLocaleDateString('hr-HR')
}

function formatDateTime(unix) {
  return new Date(Number(unix) * 1000).toLocaleString('hr-HR')
}

async function loadWalletEnvironment() {
  try {
    isMetaMaskInstalled.value = hasEthereumProvider()

    if (!isMetaMaskInstalled.value) {
      currentChainId.value = ''
      isCorrectNetwork.value = false
      onboardingMsg.value = 'MetaMask nije instaliran.'
      return
    }

    currentChainId.value = await getCurrentChainId()
    isCorrectNetwork.value =
      currentChainId.value.toLowerCase() === requiredChainId.value.toLowerCase()

    onboardingMsg.value = isCorrectNetwork.value
      ? ''
      : `Spojena je pogrešna mreža (${currentChainId.value}).`
  } catch (err) {
    onboardingMsg.value = err.message || 'Greška pri provjeri wallet okruženja.'
  }
}

async function tryAutoReconnect() {
  try {
    await loadWalletEnvironment()

    if (!isMetaMaskInstalled.value) return

    const accounts = await getConnectedAccounts()

    if (accounts.length > 0) {
      walletAddress.value = accounts[0]

      await Promise.all([
        loadListingCount(),
        loadListings(),
        loadMyReservations(),
        loadHostReservations(),
        loadTokenBalance(),
      ])
    }
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri automatskom povezivanju walleta.'
  }
}

async function switchToRequiredNetwork() {
  try {
    errorMsg.value = ''
    successMsg.value = ''

    await switchToChain(requiredChainId.value)
    await loadWalletEnvironment()

    successMsg.value = 'Mreža je uspješno promijenjena.'
  } catch (err) {
    errorMsg.value = err.message || 'Promjena mreže nije uspjela.'
  }
}

async function connectCurrentWallet() {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    walletAddress.value = await connectWallet()
    await loadWalletEnvironment()
    successMsg.value = 'MetaMask je uspješno spojen.'

    await Promise.all([
      loadListingCount(),
      loadListings(),
      loadMyReservations(),
      loadHostReservations(),
      loadTokenBalance(),
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
      reviewHash: item.reviewHash,
    }))
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju recenzija.'
    return []
  }
}

async function loadTokenBalance() {
  try {
    if (!walletAddress.value) return

    const raw = await fetchTokenBalance(walletAddress.value)
    tokenBalance.value = fromWeiToEth(raw)
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju token balansa.'
  }
}

function setupWalletListeners() {
  if (!window.ethereum) return

  window.ethereum.on('accountsChanged', async (accounts) => {
    if (!accounts || accounts.length === 0) {
      walletAddress.value = ''
      myReservations.value = []
      hostReservations.value = []
      tokenBalance.value = '0'
      successMsg.value = ''
      errorMsg.value = ''
      return
    }

    walletAddress.value = accounts[0]

    await Promise.all([
      loadListings(),
      loadMyReservations(),
      loadHostReservations(),
      loadTokenBalance(),
    ])
  })

  window.ethereum.on('chainChanged', async (chainId) => {
    currentChainId.value = chainId
    isCorrectNetwork.value = chainId.toLowerCase() === requiredChainId.value.toLowerCase()

    if (!isCorrectNetwork.value) {
      onboardingMsg.value = `Spojena je pogrešna mreža (${chainId}).`
    } else {
      onboardingMsg.value = ''
      await loadListings()

      if (walletAddress.value) {
        await Promise.all([loadMyReservations(), loadHostReservations(), loadTokenBalance()])
      }
    }
  })
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
    fetchReservationsByListing,
    tokenBalance,
    loadTokenBalance,
    approveDiscountTokens,
    makeReservationWithDiscount,
    isMetaMaskInstalled,
    isCorrectNetwork,
    currentChainId,
    requiredChainId,
    onboardingMsg,
    loadWalletEnvironment,
    tryAutoReconnect,
    switchToRequiredNetwork,
    setupWalletListeners,
    getMetaMaskDownloadUrl,
  }
}
