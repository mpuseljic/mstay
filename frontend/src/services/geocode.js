const API_BASE = 'http://localhost:3001/api'

export async function geocodeLocation(query) {
  const response = await fetch(`${API_BASE}/geocode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'Greška kod geocodinga.')
  }

  return data.result
}
