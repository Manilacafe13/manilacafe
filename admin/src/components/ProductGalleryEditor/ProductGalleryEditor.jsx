import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import './ProductGalleryEditor.css'

const MAX_IMAGES = 5

export default function ProductGalleryEditor({
  product,
  backendUrl,
  getImageUrl,
  onClose,
  onSaved
}) {
  const [images, setImages] = useState(() =>
    product.images?.length ? [...product.images] : [product.image].filter(Boolean)
  )
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [files])

  const moveImage = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= images.length) return

    setImages(previous => {
      const updated = [...previous]
      ;[updated[index], updated[nextIndex]] =
        [updated[nextIndex], updated[index]]
      return updated
    })
  }

  const addFiles = event => {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''

    if (!selected.length) return

    if (images.length + files.length + selected.length > MAX_IMAGES) {
      toast.error('Maximalt 5 bilder per produkt.')
      return
    }

    if (selected.some(file =>
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )) {
      toast.error('Använd JPG, PNG eller WebP, högst 5 MB per bild.')
      return
    }

    setFiles(previous => [...previous, ...selected])
  }

  const saveGallery = async () => {
    if (saving) return

    if (images.length + files.length < 1) {
      toast.error('Minst en produktbild måste finnas kvar.')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Logga in som administratör.')
      return
    }

    const formData = new FormData()
    formData.append('id', product._id)
    formData.append('expectedImage', product.image)
    formData.append('keepImages', JSON.stringify(images))
    files.forEach(file => formData.append('images', file))

    try {
      setSaving(true)

      const response = await axios.post(
        `${backendUrl}/api/food/gallery`,
        formData,
        { headers: { token } }
      )

      if (!response.data.success) {
        throw new Error(response.data.message || 'Kunde inte spara.')
      }

      toast.success('Produktbilderna har sparats!')
      onSaved?.(response.data.data)
      onClose()
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        error.message ||
        'Kunde inte spara bildgalleriet.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mc-gallery-overlay" role="presentation">
      <section
        className="mc-gallery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mc-gallery-heading"
      >
        <div className="mc-gallery-header">
          <div>
            <h2 id="mc-gallery-heading">Bilder – {product.name}</h2>
            <p>{images.length + files.length} av {MAX_IMAGES} bilder</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving}
            aria-label="Stäng">✕</button>
        </div>

        <div className="mc-gallery-grid">
          {images.map((src, index) => (
            <div className="mc-gallery-photo" key={src}>
              <img src={getImageUrl(src)} alt={`Produktbild ${index + 1}`} />
              {index === 0 && <span className="mc-gallery-main">Huvudbild</span>}
              <div className="mc-gallery-controls">
                <button type="button" disabled={saving || index === 0}
                  onClick={() => moveImage(index, -1)}
                  aria-label="Flytta bild bakåt">←</button>
                <button type="button" disabled={saving || index === images.length - 1}
                  onClick={() => moveImage(index, 1)}
                  aria-label="Flytta bild framåt">→</button>
                <button type="button" disabled={saving}
                  onClick={() => setImages(previous =>
                    previous.filter((_, i) => i !== index)
                  )}
                  aria-label="Ta bort bild">✕</button>
              </div>
            </div>
          ))}

          {previews.map((src, index) => (
            <div className="mc-gallery-photo" key={src}>
              <img src={src} alt={`Ny bild ${index + 1}`} />
              <span className="mc-gallery-new">Ny bild</span>
              <div className="mc-gallery-controls">
                <button type="button" disabled={saving}
                  onClick={() => setFiles(previous =>
                    previous.filter((_, i) => i !== index)
                  )}>Ta bort</button>
              </div>
            </div>
          ))}
        </div>

        {images.length + files.length < MAX_IMAGES && (
          <label className="mc-gallery-upload">
            + Lägg till bilder
            <input type="file" accept="image/jpeg,image/png,image/webp"
              multiple onChange={addFiles} disabled={saving} hidden />
          </label>
        )}

        <p className="mc-gallery-help">
          Första befintliga bilden blir huvudbild. Nya bilder läggs sist
          och kan flyttas efter att du sparat.
        </p>

        <div className="mc-gallery-footer">
          <button type="button" onClick={onClose} disabled={saving}>
            Avbryt
          </button>
          <button type="button" onClick={saveGallery} disabled={saving}>
            {saving ? 'Sparar bilder…' : 'Spara bilder'}
          </button>
        </div>
      </section>
    </div>
  )
}
