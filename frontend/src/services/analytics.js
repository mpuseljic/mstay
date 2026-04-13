const API_BASE = 'http://localhost:3001/api'

export async function fetchHostAnalytics(wallet) {
  const response = await fetch(`${API_BASE}/analytics/host/${wallet}`)
  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'Greška kod dohvaćanja analitike.')
  }

  return data.analytics
}
