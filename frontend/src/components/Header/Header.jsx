import React from 'react'
import './Header.css'

const Header = () => {
  return (
    <header className="header">

      <div className="header-contents">

        <h1>
          Filippinska maträtter & desserter i Göteborg
        </h1>

        <p>
          Upptäck filippinska smaker hos Manila Café.
          Beställ klassiska maträtter och populära desserter
          för avhämtning eller leverans i Göteborg.
        </p>

        <a
          href="#food-display"
          className="header-order-btn"
        >
          Se våra erbjudanden
        </a>

      </div>

    </header>
  )
}

export default Header