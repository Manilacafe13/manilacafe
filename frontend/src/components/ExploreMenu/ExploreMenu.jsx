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
        Upptäck våra desserter
      </h2>

      <p className='explore-menu-text'>
        Utforska Manila Cafés filippinska desserter i Göteborg.
        Upptäck tropiska smaker och favoriter som Mango Float,
        Ube Cake, Fruit Cup och fler sötsaker för avhämtning
        eller leverans.
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
                alt={`${item.menu_name} – dessert från Manila Café`}
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