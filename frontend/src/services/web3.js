import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers'
import { MSTAY_CORE_ADDRESS } from '../../../backend/src/contracts/coreConfig'
import { MSTAY_REVIEWS_ADDRESS } from '../../../backend/src/contracts/reviewsConfig'
import { MSTAY_CORE_ABI } from '../../../backend/src/contracts/mstayCoreAbi'
import { MSTAY_REVIEWS_ABI } from '../../../backend/src/contracts/mstayReviewsAbi'

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask nije instaliran.')
  }

  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  })

  return accounts[0]
}

export async function getProvider() {
  if (!window.ethereum) {
    throw new Error('MetaMask nije instaliran.')
  }

  return new BrowserProvider(window.ethereum)
}

export async function getMStayCoreContract(withSigner = false) {
  const provider = await getProvider()

  if (withSigner) {
    const signer = await provider.getSigner()
    return new Contract(MSTAY_CORE_ADDRESS, MSTAY_CORE_ABI, signer)
  }

  return new Contract(MSTAY_CORE_ADDRESS, MSTAY_CORE_ABI, provider)
}

export async function getMStayReviewsContract(withSigner = false) {
  const provider = await getProvider()

  if (withSigner) {
    const signer = await provider.getSigner()
    return new Contract(MSTAY_REVIEWS_ADDRESS, MSTAY_REVIEWS_ABI, signer)
  }

  return new Contract(MSTAY_REVIEWS_ADDRESS, MSTAY_REVIEWS_ABI, provider)
}

export async function createListing(title, location, imageUrls, pricePerNight) {
  const contract = await getMStayCoreContract(true)
  const priceInWei = parseEther(pricePerNight.toString())

  const tx = await contract.createListing(title, location, imageUrls, priceInWei)
  await tx.wait()
  return tx
}

export async function fetchAllListings() {
  const contract = await getMStayCoreContract(false)
  return await contract.getAllListings()
}

export async function calculateReservationPrice(listingId, checkInDate, checkOutDate) {
  const contract = await getMStayCoreContract(false)
  return await contract.calculateReservationPrice(listingId, checkInDate, checkOutDate)
}

export async function checkDateAvailability(listingId, checkInDate, checkOutDate) {
  const contract = await getMStayCoreContract(false)
  return await contract.isDateRangeAvailable(listingId, checkInDate, checkOutDate)
}

export async function makeReservation(listingId, checkInDate, checkOutDate) {
  const contract = await getMStayCoreContract(true)

  const [, totalPriceWei] = await contract.calculateReservationPrice(
    listingId,
    checkInDate,
    checkOutDate,
  )

  const tx = await contract.makeReservation(listingId, checkInDate, checkOutDate, {
    value: totalPriceWei,
  })

  await tx.wait()
  return tx
}

export async function fetchReservationsByGuest(guestAddress) {
  const contract = await getMStayCoreContract(false)
  return await contract.getReservationsByGuest(guestAddress)
}

export async function fetchReservationsByHost(hostAddress) {
  const contract = await getMStayCoreContract(false)
  return await contract.getReservationsByHost(hostAddress)
}

export async function cancelReservationByGuest(reservationId) {
  const contract = await getMStayCoreContract(true)
  const tx = await contract.cancelReservationByGuest(reservationId)
  await tx.wait()
  return tx
}

export async function cancelReservationByHost(reservationId) {
  const contract = await getMStayCoreContract(true)
  const tx = await contract.cancelReservationByHost(reservationId)
  await tx.wait()
  return tx
}

export async function releasePayout(reservationId) {
  const contract = await getMStayCoreContract(true)
  const tx = await contract.releasePayout(reservationId)
  await tx.wait()
  return tx
}

export async function leaveReview(reservationId, rating, comment, forHost) {
  const contract = await getMStayReviewsContract(true)
  const tx = await contract.leaveReview(reservationId, rating, comment, forHost)
  await tx.wait()
  return tx
}

export async function fetchReviewsForUser(userAddress) {
  const contract = await getMStayReviewsContract(false)
  return await contract.getReviewsForUser(userAddress)
}

export function fromWeiToEth(value) {
  return formatEther(value)
}

export async function hasGuestLeftReview(reservationId) {
  const contract = await getMStayReviewsContract(false)
  return await contract.guestReviewLeft(reservationId)
}

export async function hasHostLeftReview(reservationId) {
  const contract = await getMStayReviewsContract(false)
  return await contract.hostReviewLeft(reservationId)
}

export async function fetchReviewSummaryForUser(userAddress) {
  const contract = await getMStayReviewsContract(false)
  return await contract.getReviewSummaryForUser(userAddress)
}

export async function fetchReservationsByListing(listingId) {
  const contract = await getMStayCoreContract(false)
  return await contract.getReservationsByListing(listingId)
}
