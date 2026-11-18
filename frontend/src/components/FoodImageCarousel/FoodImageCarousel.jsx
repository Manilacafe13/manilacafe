import { useRef, useState } from 'react'
import './FoodImageCarousel.css'

export default function FoodImageCarousel({ images = [], name = 'Produkt' }) {
  const trackRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const photos = (Array.isArray(images) ? images : [images])
    .map(item => typeof item === 'string' ? item : item?.url)
    .filter(Boolean)

  const moveTo = (index) => {
    const track = trackRef.current
    if (!track || !photos.length) return

    const next = (index + photos.length) % photos.length
    track.scrollTo({
      left: next * track.clientWidth,
      behavior: 'smooth'
    })
    setActiveIndex(next)
  }

  const handleScroll = () => {
    const track = trackRef.current
    if (!track || !track.clientWidth) return

    const index = Math.round(track.scrollLeft / track.clientWidth)
    setActiveIndex(Math.min(photos.length - 1, Math.max(0, index)))
  }

  if (!photos.length) return null

  return (
    <div className="mc-carousel">
      <div className="mc-carousel-track" ref={trackRef} onScroll={handleScroll}>
        {photos.map((src, index) => (
          <img
            key={`${src}-${index}`}
            src={src}
            alt={`${name} – bild ${index + 1}`}
            className="mc-carousel-image"
            loading={index === 0 ? 'eager' : 'lazy'}
            draggable="false"
          />
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="mc-carousel-arrow mc-carousel-prev"
            onClick={() => moveTo(activeIndex - 1)}
            aria-label="Föregående bild"
          >‹</button>

          <button
            type="button"
            className="mc-carousel-arrow mc-carousel-next"
            onClick={() => moveTo(activeIndex + 1)}
            aria-label="Nästa bild"
          >›</button>

          <div className="mc-carousel-dots">
            {photos.map((_, index) => (
              <button
                type="button"
                key={index}
                className={`mc-carousel-dot ${index === activeIndex ? 'active' : ''}`}
                onClick={() => moveTo(index)}
                aria-label={`Visa bild ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
