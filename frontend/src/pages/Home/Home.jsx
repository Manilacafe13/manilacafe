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


      {/* ============================================== */}
      {/* HERO */}
      {/* ============================================== */}

      <Header />


      {/* ============================================== */}
      {/* ERBJUDANDEN */}
      {/* ============================================== */}

      <section
        className="home-offers-section"
        id="erbjudanden"
        aria-labelledby="offers-title"
      >

        <div className="home-section-heading">

          <span className="home-section-eyebrow">
            MANILA CAFÉ
          </span>

          <h2 id="offers-title">
            Erbjudanden
          </h2>

          <p>
            Upptäck aktuella erbjudanden, limited editions
            och utvalda favoriter från Manila Café.
          </p>

        </div>

      </section>


      {/* ============================================== */}
      {/* MATRÄTTER */}
      {/* ============================================== */}

      <FoodDisplay
        type="meals"
      />


      {/* ============================================== */}
      {/* DESSERT FILTER */}
      {/* ============================================== */}

      <ExploreMenu
        category={category}
        setCategory={setCategory}
      />


      {/* ============================================== */}
      {/* DESSERTER */}
      {/* ============================================== */}

      <FoodDisplay
        category={category}
        type="desserts"
      />


      {/* ============================================== */}
      {/* SEO / DISCOVERY */}
      {/* ============================================== */}

      <section className="home-seo-section">

        <h2>
          Filippinska maträtter & desserter i Göteborg
        </h2>

        <h3>
          En smak av Filippinerna
        </h3>

        <p>
          Upptäck Manila Café och filippinska smaker i Göteborg.
          Här hittar du både klassiska maträtter som Sinigang
          och populära desserter som Mango Float, Ube Cake,
          Fruit Cup och andra filippinska favoriter.
        </p>

        <p>
          Beställ online för avhämtning eller leverans i Göteborg
          och upptäck både traditionella maträtter och tropiska
          desserter inspirerade av Filippinerna.
        </p>

      </section>


      {/* ============================================== */}
      {/* VÅR HISTORIA */}
      {/* ============================================== */}

      <AboutUs />


      {/* ============================================== */}
      {/* FILIPPINSK KULTUR */}
      {/* ============================================== */}

      <CultureSection />


      {/* ============================================== */}
      {/* FRAMTIDA PRODUKTER */}
      {/* ============================================== */}

      <FutureProducts />


    </main>

  )
}


export default Home