import React from 'react'
import './Header.css'

const Header = () => {
  return (
    <header className='header'>

      <div className="header-contents">

        <h1>
          Dessert i Göteborg – upptäck Manila Café
        </h1>

        <p>
          Upptäck filippinska desserter och tropiska smaker i Göteborg.
          Beställ Mango Float, Ube Cake, Fruit Cup och andra Filipino-favoriter
          online för avhämtning eller leverans.
        </p>

        <a href="#explore-menu" className="header-order-btn">
          Se våra desserter
        </a>

      </div>

    </header>
  )
}

export default Header