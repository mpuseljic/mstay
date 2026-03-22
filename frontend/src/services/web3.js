import { BrowserProvider, Contract } from 'ethers'
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

export async function createListing(title, location, pricePerNight) {
  const contract = await getMStayContract(true)
  const tx = await contract.createListing(title, location, pricePerNight)
  await tx.wait()
  return tx
}

export async function fetchAllListings() {
  const contract = await getMStayContract(false)
  return await contract.getAllListings()
}

export async function makeReservation(listingId, checkInDate, checkOutDate) {
  const contract = await getMStayContract(true)
  const tx = await contract.makeReservation(listingId, checkInDate, checkOutDate)
  await tx.wait()
  return tx
}

export async function fetchReservationsByGuest(guestAddress) {
  const contract = await getMStayContract(false)
  return await contract.getReservationsByGuest(guestAddress)
}
