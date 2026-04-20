const API_BASE = 'http://localhost:3001/api'

export async function verifyProfile({ walletAddress, provider, proofId }) {
  const res = await fetch(`${API_BASE}/profile/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      provider,
      proofId,
    }),
  })

  const data = await res.json()

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Greška pri verifikaciji profila.')
  }

  return data.profile
}

export async function unverifyProfile({ walletAddress }) {
  const res = await fetch(`${API_BASE}/profile/unverify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
    }),
  })

  const data = await res.json()

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Greška pri uklanjanju verifikacije.')
  }

  return data.profile
}
