export async function uploadImageToPinata(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('http://localhost:3001/api/upload-image', {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Greška pri uploadu slike.')
  }

  return data
}
