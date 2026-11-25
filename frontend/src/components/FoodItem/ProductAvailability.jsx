import React from 'react'
import { preparationMinutes, slotFits, stockholmParts } from '../../context/availability.js'
export default function ProductAvailability({ product }) {
  if (!product) return null
  const minutes = preparationMinutes(product)
  const now = new Date()
  const today = stockholmParts(now).date
  const stock = Number(product.sameDayStock ?? 0)
  const hasTime = slotFits(today, '22:00-23:00', minutes, 'pickup', now)
  const available = stock > 0 && hasTime
  const duration = minutes % 60 === 0 ? `${minutes / 60} tim` : `${minutes} min`
  const name = String(product.name || '').toLowerCase()
  return <div role="status" style={{margin: '10px 0', padding: '10px 12px', borderRadius: 8, border: `1px solid ${available ? '#23734a' : '#a15b24'}`, color: available ? '#23734a' : '#a15b24', background: '#fff', fontSize: 13}}>
    <strong>{stock <= 0 ? 'Slutsåld för idag' : !hasTime ? 'Inga tider kvar idag' : minutes ? `Tillagas på beställning · ${duration}` : 'Tillgänglig idag'}</strong>
    <div>{stock <= 0 || !hasTime ? 'Välj ett kommande datum i kassan.' : minutes ? (name.includes('pandesal') ? 'Vi bakar ditt bröd samma dag för att det ska vara nybakat.' : name.includes('mango float') ? 'Desserten får vila för bästa smak och konsistens.' : 'Vi förbereder produkten på beställning.') : 'Avhämtning eller hemleverans idag, när produkten och tiderna tillåter.'}</div>
    {minutes > 0 && <div>Minst {duration} förberedelse. Tid för betalning och eventuell leverans tillkommer.</div>}
  </div>
}
