const API_BASE = 'https://mstay-sqd2.onrender.com/api'
// const API_BASE = 'http://localhost:3001/api'

export async function aiSearchListings(message) {
  const response = await fetch(`${API_BASE}/api/ai-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    throw new Error('AI search failed')
  }

  return await response.json()
}

export async function fetchRecommendations(walletAddress) {
  const response = await fetch(`${API_BASE}/api/recommendations/${walletAddress}`)

  if (!response.ok) {
    throw new Error('Recommendations failed')
  }

  return await response.json()
}
