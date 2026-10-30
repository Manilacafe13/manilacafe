import React, { useContext, useState } from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { StoreContext } from '../../context/StoreContext'

// Visa bara betalningsmetoder som finns eller tydligt markeras som kommande.
// Billie är aktiverat. Swish-ansökan väntar fortfarande på godkännande.
const paymentOptions = [
  { id: 'visa', name: 'VISA' },
  { id: 'mastercard', name: 'Mastercard' },
  { id: 'klarna', name: 'Klarna.' },
  { id: 'billie', name: 'Billie', note: 'för företag' },
  { id: 'swish', name: 'Swish', note: 'kommer snart', pending: true }
]

const Navbar = ({ setShowLogin }) => {
  const [menu, setMenu] = useState('home')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const { cartItems = {}, customizedCartItems = {}, token, setToken } = useContext(StoreContext)
  const navigate = useNavigate()
  const location = useLocation()

  // Antal produkter i varukorgen: både vanliga och kundanpassade rader.
  // Kunden ska få samma gröna prick oavsett hur produkten lagts till.
  const regularCount = Object.values(cartItems).reduce(
    (total, quantity) => total + Math.max(0, Number(quantity) || 0),
    0
  )
  const customizedCount = Object.values(customizedCartItems).reduce(
    (total, line) => total + Math.max(0, Number(line?.quantity) || 0),
    0
  )
  const cartCount = regularCount + customizedCount

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
      {/* Rullande betalningsbanner, ovanför navigeringen */}
      <div
        className="payment-banner"
        role="region"
        aria-label="Betalningsalternativ hos Manila Café"
      >
        <span className="payment-banner-sr-only">
          Betala med Visa, Mastercard eller Klarna. Billie finns för företag.
          Swish är ännu inte tillgängligt.
        </span>

        <div className="payment-banner-track" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div className="payment-banner-group" key={copy}>
              <span className="payment-banner-intro">
                <span className="payment-banner-icon">✦</span>
                Betala enkelt med
              </span>

              {paymentOptions.map((option) => (
                <span
                  className={`payment-banner-option${option.pending ? ' payment-banner-option--pending' : ''}`}
                  key={`${copy}-${option.id}`}
                >
                  <span className={`payment-banner-name payment-banner-name--${option.id}`}>
                    {option.name}
                  </span>
                  {option.note && (
                    <span className="payment-banner-note">{option.note}</span>
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
          <img src={assets.logo} alt="Manila Café" className="logo" />
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
