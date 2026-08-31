import React from 'react'
import './CultureSection.css'

const CultureSection = () => {

  const cultureCards = [

    {
      icon: "🥭",
      title: "Mango",
      subtitle: "Tropisk sötma",
      text:
        "Mango är en smak som ofta förknippas med filippinska desserter. Den söta och fruktiga smaken passar perfekt i kalla och krämiga efterrätter."
    },

    {
      icon: "💜",
      title: "Ube",
      subtitle: "Den lila favoriten",
      text:
        "Ube är en lila jams som används i många filippinska sötsaker. Den är känd för sin karaktäristiska färg och milda, söta smak."
    },

    {
      icon: "🥥",
      title: "Kokos",
      subtitle: "En tropisk klassiker",
      text:
        "Kokos förekommer i många filippinska rätter och desserter och bidrar med både krämighet och en tydlig tropisk karaktär."
    },

    {
      icon: "🍧",
      title: "Halo-halo",
      subtitle: "Många smaker tillsammans",
      text:
        "Halo-halo bygger på att olika ingredienser, färger och texturer blandas tillsammans till en dessert som är både färgstark och varierad."
    }

  ]


  return (

    <section
      className="culture-section"
      id="culture"
    >

      <div className="culture-heading">

        <span className="section-eyebrow">
          SMAKER & KULTUR
        </span>

        <h2>
          Upptäck Filippinerna
          <span> genom smaken</span>
        </h2>

        <p>
          Bakom många filippinska desserter finns
          ingredienser, traditioner och kombinationer
          som berättar något om matkulturen.
          Här kan du lära känna några av smakerna
          du möter hos Manila Café.
        </p>

      </div>


      <div className="culture-grid">

        {cultureCards.map(
          (
            item,
            index
          ) => (

            <article
              className="culture-card"
              key={index}
            >

              <div className="culture-icon">
                {item.icon}
              </div>


              <span className="culture-subtitle">
                {item.subtitle}
              </span>


              <h3>
                {item.title}
              </h3>


              <p>
                {item.text}
              </p>


              <div className="culture-card-line">
              </div>

            </article>

          )
        )}

      </div>


      <div className="culture-fact">

        <div className="culture-fact-label">
          Visste du att?
        </div>

        <div>

          <h3>
            Mat är också ett sätt att välkomna.
          </h3>

          <p>
            Måltider och sötsaker kan vara en viktig
            del av gemenskap, familjetid och firanden.
            Därför vill vi att Manila Café ska kännas
            lika välkomnande som det smakar.
          </p>

        </div>

      </div>


    </section>

  )

}

export default CultureSection