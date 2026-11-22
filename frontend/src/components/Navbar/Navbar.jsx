import React, { useContext, useState } from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { StoreContext } from '../../context/StoreContext'
import { getCartBadgeCount } from '../../context/cartIntegrity.js'

// Visa bara betalningsmetoder som finns eller tydligt markeras som kommande.
// Billie är aktiverat. Swish-ansökan väntar fortfarande på godkännande.
const paymentOptions = [
  { id: 'visa', name: 'Visa', logo: '/payments/visa.svg' },
  { id: 'mastercard', name: 'Mastercard', logo: '/payments/mastercard.svg' },
  { id: 'klarna', name: 'Klarna', logo: '/payments/klarna.svg' },
  { id: 'billie', name: 'Billie', logo: '/payments/billie.svg', note: 'För företag' },
  { id: 'swish', name: 'Swish', note: 'Kommer snart', pending: true }
]

const Navbar = ({ setShowLogin }) => {
  const [menu, setMenu] = useState('home')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const { cartItems = {}, customizedCartItems = {}, food_list = [], manilaSolo, token, setToken } = useContext(StoreContext)
  const navigate = useNavigate()
  const location = useLocation()

  const cartCount = getCartBadgeCount({
    cartItems, customizedCartItems, manilaSolo, foodList: food_list
  })

  const handleMenuClick = (menuName) => {
    setMenu(menuName)
    setShowProfileMenu(false)
  }

  const handleLogoClick = () => {
    setMenu('home')
    setShowProfileMenu(false)

    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToSection = (sectionId, menuName) => {
    setMenu(menuName)
    setShowProfileMenu(false)

    if (location.pathname === '/') {
      const section = document.getElementById(sectionId)

      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }

    navigate(`/#${sectionId}`)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken('')
    setShowProfileMenu(false)
    setMenu('home')
    navigate('/')
  }

  const goToOrders = () => {
    setShowProfileMenu(false)
    navigate('/myorders')
  }

  return (
    <>
      {/* Tydliga leveransområden */}
      <div
        className="delivery-area-banner"
        role="region"
        aria-label="Leverans och avhämtning"
      >
        <div className="delivery-area-main">
          <span aria-hidden="true">🚗</span>
          <span>
            <strong>HEMLEVERANS</strong> TILL GÖTEBORG, PARTILLE & KUNGSBACKA
          </span>
        </div>
        <div className="delivery-area-pickup">
          📍 Avhämtning i Västra Frölunda
        </div>
      </div>

      {/* Betalningsbanner */}
      <div
        className="payment-banner"
        role="region"
        aria-label="Betalningsalternativ hos Manila Café"
      >
        <span className="payment-banner-sr-only">
          Betala tryggt med Visa, Mastercard eller Klarna.
          Billie finns för företag. Swish kommer snart.
        </span>

        <div className="payment-banner-track" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div className="payment-banner-group" key={copy}>
              <span className="payment-banner-intro">
                <span className="payment-banner-icon">✦</span>
                TRYGG & SMIDIG BETALNING
              </span>

              {paymentOptions.map((option) => (
                <span
                  className={`payment-banner-option${option.pending ? ' payment-banner-option--pending' : ''}`}
                  key={`${copy}-${option.id}`}
                >
                  {option.logo ? (
                    <span className="payment-banner-logo-wrap">
                      <img
                        className={`payment-banner-logo payment-banner-logo--${option.id}`}
                        src={option.logo}
                        alt=""
                        loading="eager"
                      />
                    </span>
                  ) : (
                    <span className="payment-banner-name">
                      {option.name}
                    </span>
                  )}

                  {option.note && (
                    <span className="payment-banner-note">
                      {option.note}
                    </span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <nav className="navbar">
        {/* LOGO */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="navbar-logo-link"
          aria-label="Manila Café – gå till startsidan"
        >
          <img src={assets.logo} alt="Manila Café" className="logo" decoding="async" />
        </Link>

        {/* NAVIGATION */}
        <div className="navbar-menu">
          <Link
            to="/"
            onClick={handleLogoClick}
            className={menu === 'home' ? 'active' : ''}
          >
            Hem
          </Link>

          <button
            type="button"
            onClick={() => goToSection('explore-menu', 'menu')}
            className={menu === 'menu' ? 'active' : ''}
          >
            Meny
          </button>

          <button
            type="button"
            onClick={() => goToSection('about-us', 'about-us')}
            className={menu === 'about-us' ? 'active' : ''}
          >
            Om oss
          </button>

          <button
            type="button"
            onClick={() => goToSection('footer', 'contact-us')}
            className={menu === 'contact-us' ? 'active' : ''}
          >
            Kontakta oss
          </button>
        </div>

        {/* HÖGERSIDA */}
        <div className="navbar-right">
          <img src={assets.search_icon} alt="Sök" className="navbar-search" />

          <div className="navbar-search-icon">
            <Link
              to="/cart"
              onClick={() => setShowProfileMenu(false)}
              aria-label={`Öppna varukorgen${cartCount > 0 ? `, ${cartCount} produkter` : ""}`}
            >
              <img src={assets.basket_icon} alt="" aria-hidden="true" />
            </Link>

            {cartCount > 0 && (
              <span className="dot">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>

          {!token ? (
            <button
              type="button"
              className="login-button"
              onClick={() => setShowLogin(true)}
            >
              Logga in
            </button>
          ) : (
            <div className="navbar-profile">
              <button
                type="button"
                className="profile-button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                aria-label="Öppna profilmeny"
                aria-expanded={showProfileMenu}
              >
                <img
                  src={assets.profile_icon}
                  alt=""
                  aria-hidden="true"
                  className="profile-icon"
                />
              </button>

              {showProfileMenu && (
                <div className="nav-profile-dropdown">
                  <button
                    type="button"
                    className="profile-dropdown-item"
                    onClick={goToOrders}
                  >
                    <span className="profile-dropdown-icon" aria-hidden="true">
                      📦
                    </span>
                    <span>Mina beställningar</span>
                  </button>

                  <div className="profile-dropdown-line" />

                  <button
                    type="button"
                    className="profile-dropdown-item logout-button"
                    onClick={logout}
                  >
                    <span className="profile-dropdown-icon" aria-hidden="true">
                      ↪
                    </span>
                    <span>Logga ut</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

export default Navbar
