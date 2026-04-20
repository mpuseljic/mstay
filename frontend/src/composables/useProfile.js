import { ref } from 'vue'
import { fetchProfile, saveProfile } from '../services/profile'
import { verifyProfile, unverifyProfile } from '../services/verification'

const profile = ref(null)
const profileLoading = ref(false)
const profileError = ref('')
const profileSuccess = ref('')

export function useProfile() {
  async function loadProfile(walletAddress) {
    if (!walletAddress) {
      profile.value = null
      return null
    }

    try {
      profileLoading.value = true
      profileError.value = ''

      const result = await fetchProfile(walletAddress)
      profile.value = result
      return result
    } catch (err) {
      profileError.value = err.message || 'Greška pri dohvaćanju profila.'
      profile.value = null
      return null
    } finally {
      profileLoading.value = false
    }
  }

  async function updateProfile(payload) {
    try {
      profileLoading.value = true
      profileError.value = ''
      profileSuccess.value = ''

      const result = await saveProfile(payload)
      profile.value = result
      profileSuccess.value = 'Profil je uspješno spremljen.'
      return result
    } catch (err) {
      profileError.value = err.message || 'Greška pri spremanju profila.'
      throw err
    } finally {
      profileLoading.value = false
    }
  }

  async function verifyCurrentProfile(payload) {
    try {
      profileLoading.value = true
      profileError.value = ''
      profileSuccess.value = ''

      const result = await verifyProfile(payload)
      profile.value = result
      profileSuccess.value = 'Profil je uspješno verificiran.'
      return result
    } catch (err) {
      profileError.value = err.message || 'Greška pri verifikaciji profila.'
      throw err
    } finally {
      profileLoading.value = false
    }
  }

  async function unverifyCurrentProfile(walletAddress) {
    try {
      profileLoading.value = true
      profileError.value = ''
      profileSuccess.value = ''

      const result = await unverifyProfile({ walletAddress })
      profile.value = result
      profileSuccess.value = 'Verifikacija je uklonjena.'
      return result
    } catch (err) {
      profileError.value = err.message || 'Greška pri uklanjanju verifikacije.'
      throw err
    } finally {
      profileLoading.value = false
    }
  }

  return {
    profile,
    profileLoading,
    profileError,
    profileSuccess,
    loadProfile,
    updateProfile,
    verifyCurrentProfile,
    unverifyCurrentProfile,
  }
}
