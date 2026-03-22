<script setup>
import { ref } from 'vue'
import { connectWallet, getMStayContract } from '../services/web3'

const walletAddress = ref('')
const listingCount = ref('')
const errorMsg = ref('')
const successMsg = ref('')

async function handleConnect() {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    walletAddress.value = await connectWallet()
    successMsg.value = 'MetaMask je uspješno spojen.'
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri spajanju MetaMaska.'
  }
}

async function loadListingCount() {
  try {
    errorMsg.value = ''
    successMsg.value = ''
    const contract = await getMStayContract(false)
    const count = await contract.listingCount()
    listingCount.value = count.toString()
    successMsg.value = 'Podaci iz ugovora su uspješno dohvaćeni.'
  } catch (err) {
    errorMsg.value = err.message || 'Greška pri dohvaćanju podataka.'
  }
}
</script>

<template>
  <main class="page">
    <div class="card">
      <h1>mStay</h1>
      <p class="subtitle">Test spajanja MetaMask walleta i čitanja smart contracta</p>

      <div class="actions">
        <button @click="handleConnect">Spoji MetaMask</button>
        <button @click="loadListingCount">Dohvati broj oglasa</button>
      </div>

      <div class="info-box" v-if="walletAddress">
        <strong>Spojeni wallet:</strong>
        <div>{{ walletAddress }}</div>
      </div>

      <div class="info-box" v-if="listingCount !== ''">
        <strong>Broj oglasa u ugovoru:</strong>
        <div>{{ listingCount }}</div>
      </div>

      <p class="success" v-if="successMsg">{{ successMsg }}</p>
      <p class="error" v-if="errorMsg">{{ errorMsg }}</p>
    </div>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.card {
  width: 100%;
  max-width: 720px;
  background: white;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

h1 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 2rem;
}

.subtitle {
  margin-top: 0;
  margin-bottom: 24px;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 12px 18px;
  font-weight: 600;
  cursor: pointer;
  background: #111827;
  color: white;
}

button:hover {
  opacity: 0.92;
}

.info-box {
  background: #f3f4f6;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 14px;
  word-break: break-all;
}

.success {
  color: #166534;
  margin-top: 16px;
}

.error {
  color: #b91c1c;
  margin-top: 16px;
}
</style>
