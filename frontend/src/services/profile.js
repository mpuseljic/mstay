const PROFILE_API_BASE = 'https://mstay-sqd2.onrender.com/api'

export async function fetchProfile(walletAddress) {
  const response = await fetch(`${PROFILE_API_BASE}/profile/${walletAddress}`)
  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Greška pri dohvaćanju profila.')
  }

  return data.profile
}

export async function saveProfile(profile) {
  const response = await fetch(`${PROFILE_API_BASE}/profile/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Greška pri spremanju profila.')
  }

  return data.profile
}
