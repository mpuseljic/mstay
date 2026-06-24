const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export async function syncListingsToBackend(listings) {
  const response = await fetch(`${API_BASE}/api/sync-listings`, {
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
