import React from 'react'
import './ExploreMenu.css'
import { menu_list, meal_list } from '../../assets/assets'

const ExploreMenu = ({
  category,
  setCategory,
  type = "desserts"
}) => {

  const isMeals = type === "meals"

  const list = isMeals
    ? meal_list
    : menu_list

  return (
    <section
      className="explore-menu"
      id={isMeals ? "meal-menu" : "explore-menu"}
      aria-labelledby={
        isMeals
          ? "meal-menu-title"
          : "explore-menu-title"
      }
    >

      <h2
        id={
          isMeals
            ? "meal-menu-title"
            : "explore-menu-title"
        }
      >
        {isMeals
          ? "Upptäck våra maträtter"
          : "Upptäck våra desserter"
        }
      </h2>

      <p className="explore-menu-text">
        {isMeals
          ? "Utforska Manila Cafés filippinska maträtter och klassiska smaker från Filippinerna."
          : "Utforska Manila Cafés filippinska desserter i Göteborg. Välj bland tropiska favoriter som Mango Float, Ube Cake, Fruit Cup och Turon."
        }
      </p>

      <div className="explore-menu-list">

        {list.map((item, index) => {

          const isActive =
            category === item.menu_name

          return (
            <button
              type="button"
              key={index}
              className="explore-menu-list-item"
              aria-pressed={isActive}
              aria-label={`Visa ${item.menu_name}`}
              onClick={() =>
                setCategory(prev =>
                  prev === item.menu_name
                    ? "All"
                    : item.menu_name
                )
              }
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