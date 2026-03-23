import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers'
import { MSTAY_CONTRACT_ADDRESS } from '../contracts/config'
import { MSTAY_ABI } from '../contracts/mstayAbi'

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

export async function getSigner() {
  const provider = await getProvider()
  return await provider.getSigner()
}

export async function getMStayContract(withSigner = false) {
  const provider = await getProvider()

  if (withSigner) {
    const signer = await provider.getSigner()
    return new Contract(MSTAY_CONTRACT_ADDRESS, MSTAY_ABI, signer)
  }

  return new Contract(MSTAY_CONTRACT_ADDRESS, MSTAY_ABI, provider)
}

export async function createListing(title, location, imageUrl, pricePerNight) {
  const contract = await getMStayContract(true)
  const priceInWei = parseEther(pricePerNight.toString())

  const tx = await contract.createListing(title, location, imageUrl, priceInWei)
  await tx.wait()
  return tx
}

export async function fetchAllListings() {
  const contract = await getMStayContract(false)
  return await contract.getAllListings()
}

export async function calculateReservationPrice(listingId, checkInDate, checkOutDate) {
  const contract = await getMStayContract(false)
  return await contract.calculateReservationPrice(listingId, checkInDate, checkOutDate)
}

export async function makeReservation(listingId, checkInDate, checkOutDate) {
  const contract = await getMStayContract(true)
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
  const contract = await getMStayContract(false)
  return await contract.getReservationsByGuest(guestAddress)
}

export async function fetchReservationsByHost(hostAddress) {
  const contract = await getMStayContract(false)
  return await contract.getReservationsByHost(hostAddress)
}

export async function cancelReservationByGuest(reservationId) {
  const contract = await getMStayContract(true)
  const tx = await contract.cancelReservationByGuest(reservationId)
  await tx.wait()
  return tx
}

export async function cancelReservationByHost(reservationId) {
  const contract = await getMStayContract(true)
  const tx = await contract.cancelReservationByHost(reservationId)
  await tx.wait()
  return tx
}

export async function releasePayout(reservationId) {
  const contract = await getMStayContract(true)
  const tx = await contract.releasePayout(reservationId)
  await tx.wait()
  return tx
}

export function fromWeiToEth(value) {
  return formatEther(value)
}
