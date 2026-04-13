export async function uploadMultipleImagesToPinata(files) {
  const uploaded = []

  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('https://mstay-sqd2.onrender.com/api/upload-image', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Greška pri uploadu slike.')
    }

    uploaded.push(data.ipfsUrl)
  }

  return uploaded
}

export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('https://mstay-sqd2.onrender.com/api/upload-image', {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Greška kod upload-a slike.')
  }

  return data.ipfsUrl
}
