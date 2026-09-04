import React from 'react'
import './Footer.css'
import { assets } from '../../assets/assets'
import { Link } from 'react-router-dom'


const Footer = () => {

  return (

    <footer
      className="footer"
      id="footer"
    >

      <div className="footer-content">


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


        <div className="footer-content-center">

          <h3>
            Information
          </h3>

          <ul>

            <li>
              <Link to="/">
                Hem
              </Link>
            </li>

            <li>
              <Link to="/kopvillkor">
                Köpvillkor
              </Link>
            </li>

            <li>
              <Link to="/avbokning">
                Avbokning & återbetalning
              </Link>
            </li>

            <li>
              <Link to="/leverans">
                Leverans & upphämtning
              </Link>
            </li>

            <li>
              <Link to="/integritet">
                Integritetspolicy
              </Link>
            </li>

            <li>
              <Link to="/kontakt">
                Kontakt & företagsinfo
              </Link>
            </li>

          </ul>

        </div>


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

            <a href="mailto:info@manilacafe.se">
              info@manilacafe.se
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


      <div className="footer-divider">
      </div>


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