import { ref } from 'vue'
import { fetchProfile, saveProfile } from '../services/profile'

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

  return {
    profile,
    profileLoading,
    profileError,
    profileSuccess,
    loadProfile,
    updateProfile,
  }
}
