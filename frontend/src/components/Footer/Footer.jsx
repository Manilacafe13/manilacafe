import React from 'react'
import './Footer.css'
import { assets } from '../../assets/assets'

const Footer = () => {

  return (

    <footer
      className="footer"
      id="footer"
    >

      <div className="footer-content">


        {/* ============================= */}
        {/* MANILA CAFÉ */}
        {/* ============================= */}

        <div className="footer-content-left">

          <span className="footer-small-title">
            MANILA CAFÉ
          </span>

          <h2>
            En smak av
            <span> Filippinerna</span>
          </h2>

          <p>
            Filippinska desserter med tropiska
            smaker, värme och en liten berättelse
            bakom varje tugga.
          </p>

          <p className="footer-message">
            Gjort för att delas, upptäckas
            och njutas tillsammans.
          </p>


          <div className="footer-social-icons">

            <img
              src={assets.facebook_icon}
              alt="Facebook"
            />

            <img
              src={assets.twitter_icon}
              alt="Twitter"
            />

            <img
              src={assets.linkedin_icon}
              alt="LinkedIn"
            />

          </div>

        </div>


        {/* ============================= */}
        {/* LINKS */}
        {/* ============================= */}

        <div className="footer-content-center">

          <h3>
            Utforska
          </h3>

          <ul>

            <li>
              <a href="/">
                Hem
              </a>
            </li>

            <li>
              <a href="#explore-menu">
                Våra desserter
              </a>
            </li>

            <li>
              <a href="#about-us">
                Om oss
              </a>
            </li>

            <li>
              <a href="#culture">
                Filippinsk kultur
              </a>
            </li>

            <li>
              <a href="#footer">
                Kontakta oss
              </a>
            </li>

          </ul>

        </div>


        {/* ============================= */}
        {/* CONTACT */}
        {/* ============================= */}

        <div className="footer-content-right">

          <h3>
            Kontakta oss
          </h3>


          <div className="footer-contact-item">

            <span className="footer-contact-label">
              Telefon
            </span>

            <a href="tel:0762226393">
              076-222 63 93
            </a>

          </div>


          <div className="footer-contact-item">

            <span className="footer-contact-label">
              E-post
            </span>

            <a href="mailto:manilacafe.goteborg@gmail.com">
              manilacafe.goteborg@gmail.com
            </a>

          </div>


          <div className="footer-contact-note">

            <span>
              ♡
            </span>

            <p>
              Frågor om våra desserter eller
              din beställning? Du är alltid
              välkommen att kontakta oss.
            </p>

          </div>

        </div>


      </div>


      {/* ============================= */}
      {/* DIVIDER */}
      {/* ============================= */}

      <div className="footer-divider">
      </div>


      {/* ============================= */}
      {/* BOTTOM */}
      {/* ============================= */}

      <div className="footer-bottom">

        <p className="footer-copyright">
          © 2026 Manila Café. Alla rättigheter förbehållna.
        </p>

        <p className="footer-bottom-message">
          Filippinska smaker • Göteborg
        </p>

      </div>

    </footer>

  )

}

export default Footer