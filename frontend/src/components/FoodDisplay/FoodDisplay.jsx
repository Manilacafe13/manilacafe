import React, { useContext } from 'react'
import './FoodDisplay.css'

import { StoreContext } from '../../context/StoreContext'
import FoodItem from '../FoodItem/FoodItem'


const FoodDisplay = ({
  category = "All",
  type = "desserts"
}) => {

  const {
    food_list = []
  } = useContext(StoreContext)


  // ======================================================
  // PRODUCT TYPE
  // ======================================================

  const isMeals = type === "meals"


  // ======================================================
  // NORMALIZE TEXT
  // ======================================================

  const normalizeText = (value = "") =>
    String(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Tillfällig kompatibilitet med produktnamnet "Siningang"
      .replace(/siningang/g, "sinigang")


  // ======================================================
  // FILTER PRODUCTS
  // ======================================================

  const filteredFoods = food_list.filter((item) => {

    // ==================================================
    // MATRÄTTER
    // ==================================================

    if (isMeals) {

      // Produkten måste vara en maträtt
      if (item.category !== "Maträtter") {
        return false
      }

      // Visa alla maträtter
      if (category === "All") {
        return true
      }

      // Filtrera efter maträttens namn
      return normalizeText(item.name).includes(
        normalizeText(category)
      )
    }


    // ==================================================
    // DESSERTER
    // ==================================================

    // Maträtter ska aldrig visas bland desserterna
    if (item.category === "Maträtter") {
      return false
    }

    // Visa alla desserter
    if (category === "All") {
      return true
    }

    // Filtrera dessertkategori
    return item.category === category

  })


  // ======================================================
  // HIDE EMPTY MEALS SECTION
  // ======================================================

  if (
    isMeals &&
    category === "All" &&
    filteredFoods.length === 0
  ) {
    return null
  }


  // ======================================================
  // SECTION INFORMATION
  // ======================================================

  const sectionId = isMeals
    ? "meals-display"
    : "food-display"

  const titleId = isMeals
    ? "meals-display-title"
    : "food-display-title"


  // ======================================================
  // JSX
  // ======================================================

  return (
    <section
      className={`food-display ${
        isMeals
          ? "food-display-meals"
          : "food-display-desserts"
      }`}
      id={sectionId}
      aria-labelledby={titleId}
    >

      {/* ============================================== */}
      {/* INTRO */}
      {/* ============================================== */}

      <div className="food-display-intro">

        {isMeals ? (

          <>
            <span className="food-display-eyebrow">
              FILIPINO FOOD
            </span>

            <h2 id={titleId}>
              Maträtter
            </h2>

            <p>
              Upptäck våra filippinska maträtter i Göteborg.
              Klassiska smaker från Filippinerna för avhämtning
              eller leverans.
            </p>
          </>

        ) : (

          <>
            <span className="food-display-eyebrow">
              FILIPINO DESSERTS
            </span>

            <h2 id={titleId}>
              Våra desserter
            </h2>

            <p>
              Hitta din nästa favorit hos Manila Café.
              Välj bland filippinska desserter och tropiska
              favoriter som Mango Float, Ube Cake, Fruit Cup,
              Turon och fler söta smaker.
            </p>
          </>

        )}

      </div>


      {/* ============================================== */}
      {/* PRODUCTS */}
      {/* ============================================== */}

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
              {
                isMeals
                  ? "Ingen maträtt hittades i den här kategorin just nu."
                  : "Inga desserter hittades i den här kategorin just nu."
              }
            </p>

          </div>

        )}

      </div>

    </section>
  )
}


export default FoodDisplay