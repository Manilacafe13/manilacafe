import React from 'react'
import { preparationMinutes, slotFits, stockholmParts } from '../../context/availability.js'
import './ProductAvailability.css'

export default function ProductAvailability({ product, detailed = false }) {
  if (!product) return null
  const minutes = preparationMinutes(product)
  const now = new Date()
  const today = stockholmParts(now).date
  const stock = Number(product.sameDayStock ?? 0)
  const hasTime = slotFits(today, '22:00-23:00', minutes, 'pickup', now)
  const soldOut = stock <= 0
  const available = stock > 0 && hasTime
  const status = soldOut ? 'Slutsåld idag' : !hasTime ? 'Inga tider kvar idag' : 'Tillgänglig idag'
  const hint = soldOut || !hasTime ? 'Välj ett kommande datum i kassan.' : 'Dagens tillgänglighet. Exakta tider för avhämtning och leverans visas i kassan.'
  const duration = minutes % 60 === 0 ? `${minutes / 60} tim` : `${minutes} min`
  const name = String(product.name || '').toLowerCase()
  const prepLabel = name.includes('pandesal') ? 'Nybakat' : name.includes('mango float') ? 'Kyltid' : 'Tillagning'

  return (
    <span className="mc-availability" role="status">
      <span className={`mc-availability-status ${available ? 'mc-availability-status--available' : soldOut ? 'mc-availability-status--sold-out' : 'mc-availability-status--late'}`} title={hint}>
        <span className="mc-availability-dot" aria-hidden="true" />
        {status}
      </span>
      {minutes > 0 && (
        <span className="mc-availability-time" title={`${prepLabel}: minst ${duration}. Betalnings- och eventuell leveranstid tillkommer.`} aria-label={`${prepLabel}: ${duration}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {detailed ? `${prepLabel} · ${duration}` : duration}
        </span>
      )}
    </span>
  )
}
