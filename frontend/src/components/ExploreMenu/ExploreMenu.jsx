
import React from 'react'
import './ExploreMenu.css'
import { menu_list, meal_list, drink_list } from '../../assets/assets'

const ExploreMenu = ({
  category,
  setCategory,
  type = "desserts"
}) => {

  const menuConfig = {
    desserts: {
      list: menu_list,
      id: "explore-menu",
      title: "Upptäck våra desserter",
      description:
        "Utforska Manila Cafés filippinska desserter i Göteborg. Välj bland tropiska favoriter som Mango Float, Ube Cake, Fruit Cup och Turon."
    },
    meals: {
      list: meal_list,
      id: "meal-menu",
      title: "Upptäck våra maträtter",
      description:
        "Utforska Manila Cafés filippinska maträtter och klassiska smaker från Filippinerna."
    },
    drinks: {
      list: drink_list,
      id: "drink-menu",
      title: "Upptäck våra drycker",
      description:
        "Upptäck våra kaffedrycker på Manila Café. Fler spännande drycker och tropiska smaker kommer framöver."
    }
  }

  const currentMenu = menuConfig[type] || menuConfig.desserts

  return (
    <section
      className="explore-menu"
      id={currentMenu.id}
      aria-labelledby={`${currentMenu.id}-title`}
    >
      <h2 id={`${currentMenu.id}-title`}>
        {currentMenu.title}
      </h2>

      <p className="explore-menu-text">
        {currentMenu.description}
      </p>

      <div className="explore-menu-list">
        {currentMenu.list.map((item) => {

          const isActive = category === item.menu_name

          return (
            <button
              type="button"
              key={item.menu_name}
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

              <span>{item.menu_name}</span>
            </button>
          )
        })}
      </div>

      <hr />
    </section>
  )
}

export default ExploreMenu
