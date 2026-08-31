import React, {
  useContext,
  useState
} from 'react'

import './Navbar.css'

import {
  assets
} from '../../assets/assets'

import {
  Link,
  useNavigate
} from 'react-router-dom'

import {
  StoreContext
} from '../../context/StoreContext'


const Navbar = ({
  setShowLogin
}) => {

  const [
    menu,
    setMenu
  ] = useState("home")


  const [
    showProfileMenu,
    setShowProfileMenu
  ] = useState(false)


  const {
    cartItems = {},
    token,
    setToken
  } = useContext(StoreContext)


  const navigate =
    useNavigate()


  // ======================================================
  // CART COUNT
  // ======================================================

  const cartCount =
    Object.values(
      cartItems
    ).reduce(
      (
        total,
        quantity
      ) => {

        return (
          total +
          Number(
            quantity || 0
          )
        )

      },
      0
    )


  // ======================================================
  // NAVIGATION
  // ======================================================

  const handleMenuClick = (
    menuName
  ) => {

    setMenu(
      menuName
    )

    setShowProfileMenu(
      false
    )

  }


  // ======================================================
  // LOGOUT
  // ======================================================

  const logout = () => {

    localStorage.removeItem(
      "token"
    )


    setToken("")

    setShowProfileMenu(false)

    setMenu("home")


    navigate("/")

  }


  // ======================================================
  // MY ORDERS
  // ======================================================

  const goToOrders = () => {

    setShowProfileMenu(false)

    navigate("/myorders")

  }


  // ======================================================
  // JSX
  // ======================================================

  return (

    <nav className="navbar">


      {/* ================================================ */}
      {/* LOGO */}
      {/* ================================================ */}

      <Link
        to="/"
        onClick={() =>
          handleMenuClick(
            "home"
          )
        }
        className="navbar-logo-link"
      >

        <img
          src={assets.logo}
          alt="Manila Café"
          className="logo"
        />

      </Link>


      {/* ================================================ */}
      {/* MENU */}
      {/* ================================================ */}

      <div className="navbar-menu">


        {/* HOME */}

        <Link
          to="/"
          onClick={() =>
            handleMenuClick(
              "home"
            )
          }
          className={
            menu === "home"
              ? "active"
              : ""
          }
        >
          Hem
        </Link>


        {/* PRODUCTS */}

        <a
          href="#explore-menu"
          onClick={() =>
            handleMenuClick(
              "menu"
            )
          }
          className={
            menu === "menu"
              ? "active"
              : ""
          }
        >
          Meny
        </a>


        {/* ABOUT */}

        <a
          href="#about-us"
          onClick={() =>
            handleMenuClick(
              "about-us"
            )
          }
          className={
            menu === "about-us"
              ? "active"
              : ""
          }
        >
          Om oss
        </a>


        {/* CONTACT */}

        <a
          href="#footer"
          onClick={() =>
            handleMenuClick(
              "contact-us"
            )
          }
          className={
            menu === "contact-us"
              ? "active"
              : ""
          }
        >
          Kontakta oss
        </a>


      </div>


      {/* ================================================ */}
      {/* RIGHT SIDE */}
      {/* ================================================ */}

      <div className="navbar-right">


        {/* ============================================== */}
        {/* SEARCH */}
        {/* ============================================== */}

        <img
          src={assets.search_icon}
          alt="Sök"
          className="navbar-search"
        />


        {/* ============================================== */}
        {/* CART */}
        {/* ============================================== */}

        <div className="navbar-search-icon">

          <Link
            to="/cart"
            onClick={() =>
              setShowProfileMenu(
                false
              )
            }
          >

            <img
              src={assets.basket_icon}
              alt="Varukorg"
            />

          </Link>


          {cartCount > 0 && (

            <span className="dot">

              {
                cartCount > 99
                  ? "99+"
                  : cartCount
              }

            </span>

          )}

        </div>


        {/* ============================================== */}
        {/* LOGIN / PROFILE */}
        {/* ============================================== */}

        {!token ? (

          <button
            type="button"
            className="login-button"
            onClick={() =>
              setShowLogin(
                true
              )
            }
          >
            Logga in
          </button>

        ) : (

          <div className="navbar-profile">


            {/* PROFILE BUTTON */}

            <button
              type="button"
              className="profile-button"
              onClick={() =>
                setShowProfileMenu(
                  (prev) =>
                    !prev
                )
              }
              aria-label="Öppna profilmeny"
              aria-expanded={
                showProfileMenu
              }
            >

              <img
                src={assets.profile_icon}
                alt="Profil"
                className="profile-icon"
              />

            </button>


            {/* PROFILE DROPDOWN */}

            {showProfileMenu && (

              <div className="nav-profile-dropdown">


                {/* MY ORDERS */}

                <button
                  type="button"
                  className="profile-dropdown-item"
                  onClick={
                    goToOrders
                  }
                >

                  <span className="profile-dropdown-icon">
                    📦
                  </span>

                  <span>
                    Mina beställningar
                  </span>

                </button>


                <div className="profile-dropdown-line">
                </div>


                {/* LOGOUT */}

                <button
                  type="button"
                  className="profile-dropdown-item logout-button"
                  onClick={
                    logout
                  }
                >

                  <span className="profile-dropdown-icon">
                    ↪
                  </span>

                  <span>
                    Logga ut
                  </span>

                </button>


              </div>

            )}


          </div>

        )}


      </div>


    </nav>

  )

}


export default Navbar