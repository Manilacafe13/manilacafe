import React from 'react'
import './Header.css'

const Header = () => {
  return (
    <header className="header header--delivery">
      <div className="header-contents">
        <span className="header-eyebrow">
          🇵🇭 MANILA CAFÉ · GÖTEBORG
        </span>

        <h1>
          Filippinsk mat & desserter, direkt till dig.
        </h1>

        <p className="header-intro">
          Välj dina favoriter från vår meny och lägg dem i varukorgen.
        </p>

        <div className="header-delivery-options">
          <div className="header-delivery-card">
            <span className="header-delivery-icon" aria-hidden="true">🚗</span>
            <strong>Hemleverans</strong>
            <span>Göteborg, Partille & Kungsbacka</span>
          </div>

          <div className="header-delivery-card">
            <span className="header-delivery-icon" aria-hidden="true">📍</span>
            <strong>Avhämtning</strong>
            <span>Mandolingatan 13, Västra Frölunda</span>
          </div>
        </div>

        <a href="#explore-menu" className="header-order-btn">
          Se vår meny ↓
        </a>

        <p className="header-order-steps">
          Välj produkter → Lägg i varukorgen → Välj leveranssätt i kassan
        </p>
      </div>
    </header>
  )
}

export default Header