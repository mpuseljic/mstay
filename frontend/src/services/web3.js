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

export async function getMStayContract(withSigner = false) {
  const provider = await getProvider()

  if (withSigner) {
    const signer = await provider.getSigner()
    return new Contract(MSTAY_CONTRACT_ADDRESS, MSTAY_ABI, signer)
  }

  return new Contract(MSTAY_CONTRACT_ADDRESS, MSTAY_ABI, provider)
}
