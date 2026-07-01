const API_BASE = 'https://mstay-sqd2.onrender.com/api'
// const API_BASE = 'http://localhost:3001/api'

export async function syncListingsToBackend(listings) {
  const response = await fetch(`${API_BASE}/sync-listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ listings }),
  })

  if (!response.ok) {
    throw new Error('Listing sync failed')
  }

  return await response.json()
}
