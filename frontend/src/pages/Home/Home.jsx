import React, { useState } from 'react'

import './Home.css'

import Header from '../../components/Header/Header'
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu'
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay'
import AboutUs from '../../components/AboutUs/AboutUs'
import CultureSection from '../../components/CultureSection/CultureSection'
import FutureProducts from '../../components/FutureProducts/FutureProducts'


const Home = () => {

  const [category, setCategory] = useState("All")

  return (
    <main className="home">

      <Header />

      <ExploreMenu
        category={category}
        setCategory={setCategory}
      />

      <FoodDisplay
        category={category}
      />


      {/* SEO / DISCOVERY SECTION */}

      <section className="home-seo-section">

        <h2>
          Filippinska desserter i Göteborg
        </h2>

        <h3>
          Sugen på något sött?
        </h3>

        <p>
          Upptäck Manila Café – filippinska desserter och tropiska
          sötsaker i Göteborg. Här hittar du bland annat Mango Float,
          Ube Cake, Fruit Cup och andra Filipino-favoriter.
          Beställ dessert online för avhämtning eller leverans i Göteborg.
        </p>

        <p>
          Oavsett om du letar efter något sött till fikat,
          vill testa en asiatisk dessert eller är sugen på mango,
          ube och filippinska smaker hittar du något annorlunda
          hos Manila Café.
        </p>

      </section>


      {/* VÅR HISTORIA */}

      <AboutUs />


      {/* FILIPPINSK KULTUR */}

      <CultureSection />


      {/* CUSTOMER VOTING */}

      <FutureProducts />

    </main>
  )
}

export default Home