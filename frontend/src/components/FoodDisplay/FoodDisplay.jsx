
import React, { useContext } from 'react'
import './FoodDisplay.css'

import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'

const FoodDisplay = ({
  category = "All",
  type = "desserts"
}) => {

  const { food_list = [] } = useContext(StoreContext)

  // ======================================================
  // NORMALIZE TEXT
  // ======================================================

  const normalizeText = (value = "") =>
    String(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/siningang/g, "sinigang")

  // ======================================================
  // PRODUCT TYPES
  // ======================================================

  const isMeals = type === "meals"
  const isDrinks = type === "drinks"

  const normalizedCategory = normalizeText(category)

  const drinkCategories = [
    "coffee",
    "smoothies",
    "coolers"
  ]

  // ======================================================
  // FILTER PRODUCTS
  // ======================================================

  const filteredFoods = food_list.filter((item) => {

    const itemCategory = normalizeText(item.category)

    // MATRÄTTER
    if (isMeals) {

      if (itemCategory !== "matratter") {
        return false
      }

      if (normalizedCategory === "all") {
        return true
      }

      return normalizeText(item.name).includes(
        normalizedCategory
      )
    }

    // DRYCKER
    if (isDrinks) {

      if (!drinkCategories.includes(itemCategory)) {
        return false
      }

      if (normalizedCategory === "all") {
        return true
      }

      return itemCategory === normalizedCategory
    }

    // DESSERTER
    if (
      itemCategory === "matratter" ||
      drinkCategories.includes(itemCategory)
    ) {
      return false
    }

    if (normalizedCategory === "all") {
      return true
    }

    return itemCategory === normalizedCategory
  })

  // ======================================================
  // SECTION SETTINGS
  // ======================================================

  const sections = {
    desserts: {
      id: "food-display",
      className: "food-display-desserts",
      eyebrow: "FILIPINO DESSERTS",
      title: "Våra desserter",
      description:
        "Hitta din nästa favorit hos Manila Café. Välj bland filippinska desserter och tropiska favoriter som Mango Float, Ube Cake, Fruit Cup, Turon och fler söta smaker.",
      empty:
        "Inga desserter hittades i den här kategorin just nu."
    },
    meals: {
      id: "meals-display",
      className: "food-display-meals",
      eyebrow: "FILIPINO FOOD",
      title: "Maträtter",
      description:
        "Upptäck våra filippinska maträtter i Göteborg. Klassiska smaker från Filippinerna för avhämtning eller leverans.",
      empty:
        "Ingen maträtt hittades i den här kategorin just nu."
    },
    drinks: {
      id: "drinks-display",
      className: "food-display-drinks",
      eyebrow: "MANILA CAFÉ DRINKS",
      title: "Våra drycker",
      description:
        "Upptäck våra kaffedrycker. Från klassiska favoriter till nya spännande smaker. Smoothies och Coolers kommer framöver.",
      empty:
        "Inga drycker hittades i den här kategorin just nu."
    }
  }

  const currentSection =
    sections[type] || sections.desserts

  const titleId = `${currentSection.id}-title`

  // ======================================================
  // HIDE EMPTY MEALS SECTION
  // ======================================================

  if (
    isMeals &&
    normalizedCategory === "all" &&
    filteredFoods.length === 0
  ) {
    return null
  }

  // ======================================================
  // JSX
  // ======================================================

  return (
    <section
      className={`food-display ${currentSection.className}`}
      id={currentSection.id}
      aria-labelledby={titleId}
    >

      <div className="food-display-intro">

        <span className="food-display-eyebrow">
          {currentSection.eyebrow}
        </span>

        <h2 id={titleId}>
          {currentSection.title}
        </h2>

        <p>
          {currentSection.description}
        </p>

      </div>

      <div
        className="food-display-list"
        aria-live="polite"
      >

        {filteredFoods.length > 0 ? (

          filteredFoods.map((item) => (

            <FoodItem
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              image={item.image}
              category={item.category}
            />

          ))

        ) : (

          <div className="food-display-empty">
            <p>
              {currentSection.empty}
            </p>
          </div>

        )}

      </div>

    </section>
  )
}

export default FoodDisplay
