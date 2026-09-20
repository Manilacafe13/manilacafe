import React, { useEffect, useRef, useState } from 'react'
import './Navbar.css'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'


const Navbar = ({ onLogout }) => {

  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] =
    useState(false)

  const menuRef =
    useRef(null)


  // ======================================================
  // LOGOUT
  // ======================================================

  const logout = () => {

  localStorage.removeItem("token")

  setMenuOpen(false)

  if (onLogout) {
    onLogout()
  }

  navigate(
    "/login",
    {
      replace: true
    }
  )

}


  // ======================================================
  // CLOSE MENU WHEN CLICKING OUTSIDE
  // ======================================================

  useEffect(() => {

    const handleClickOutside = (event) => {

      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {

        setMenuOpen(false)

      }

    }


    document.addEventListener(
      "mousedown",
      handleClickOutside
    )


    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      )

    }

  }, [])


  return (

    <div className="navbar">

      <img
        className="logo"
        src={assets.logo}
        alt="Manila Café"
      />


      <div
        className="navbar-profile-wrapper"
        ref={menuRef}
      >

        <button
          type="button"
          className="navbar-profile-button"
          onClick={() =>
            setMenuOpen((prev) => !prev)
          }
          aria-label="Öppna administratörsmeny"
          aria-expanded={menuOpen}
        >

          <img
            className="profile"
            src={assets.profile_image}
            alt=""
          />

        </button>


        {
          menuOpen && (

            <div className="navbar-dropdown">

              <div className="navbar-dropdown-header">

                <strong>
                  Manila Café
                </strong>

                <span>
                  Admin
                </span>

              </div>


              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate("/orders")
                }}
              >
                Adminpanel
              </button>


              <button
                type="button"
                className="logout-button"
                onClick={logout}
              >
                Logga ut
              </button>

            </div>

          )
        }

      </div>

    </div>

  )

}


export default Navbar