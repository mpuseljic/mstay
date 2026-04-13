const API_BASE = 'https://mstay-sqd2.onrender.com/api'

export async function searchListings(payload) {
  const response = await fetch(`${API_BASE}/search-listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'Greška kod pretrage oglasa.')
  }

  return data.listings || []
}
