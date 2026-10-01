import React from 'react'
import './ExploreMenu.css'
import { menu_list } from '../../assets/assets'

const ExploreMenu = ({ category, setCategory }) => {

  return (
    <section
      className='explore-menu'
      id='explore-menu'
      aria-labelledby='explore-menu-title'
    >

      <h2 id='explore-menu-title'>
        Upptäck våra filippinska favoriter
      </h2>

      <p className='explore-menu-text'>
        Utforska Manila Cafés filippinska maträtter och desserter i Göteborg.
        Upptäck traditionella smaker, tropiska favoriter och hemlagade rätter
        för avhämtning eller leverans.
      </p>

      <div className="explore-menu-list">

        {menu_list.map((item, index) => {

          const isActive = category === item.menu_name

          return (
            <button
              type="button"
              onClick={() =>
                setCategory(prev =>
                  prev === item.menu_name
                    ? "All"
                    : item.menu_name
                )
              }
              key={index}
              className="explore-menu-list-item"
              aria-pressed={isActive}
              aria-label={`Visa ${item.menu_name}`}
            >

              <img
                className={isActive ? "active" : ""}
                src={item.menu_image}
                alt={`${item.menu_name} från Manila Café`}
                loading="lazy"
              />

              <span>
                {item.menu_name}
              </span>

            </button>
          )

        })}

      </div>

      <hr />

    </section>
  )
}

export default ExploreMenu