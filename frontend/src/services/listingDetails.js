const LISTING_DETAILS_API_BASE = 'https://mstay-sqd2.onrender.com/api'

export async function fetchListingDetails(listingId) {
  const response = await fetch(`${LISTING_DETAILS_API_BASE}/listing-details/${listingId}`)
  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Greška pri dohvaćanju detalja oglasa.')
  }

  return data.details
}

export async function saveListingDetails(payload) {
  const response = await fetch(`${LISTING_DETAILS_API_BASE}/listing-details/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'Greška pri spremanju detalja oglasa.')
  }

  return data.details
}
