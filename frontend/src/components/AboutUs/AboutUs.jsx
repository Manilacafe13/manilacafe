import React from 'react'
import './AboutUs.css'


const AboutUs = () => {

  return (

    <section
      className="about-us"
      id="about-us"
      aria-labelledby="about-us-title"
    >

      <div className="about-us-inner">


        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div
          className="about-us-visual"
          aria-hidden="true"
        >

          <div className="about-us-decoration decoration-one">
          </div>

          <div className="about-us-decoration decoration-two">
          </div>


          <div className="about-us-main-card">

            <span className="about-us-small-title">
              Manila Café
            </span>

            <h2>
              En liten smak av
              <span> Filippinerna</span>
            </h2>

            <p>
              Filippinska desserter skapade för att
              delas, upptäckas och njutas tillsammans.
            </p>


            <div className="about-us-flavours">

              <span>
                Mango
              </span>

              <span>
                Ube
              </span>

              <span>
                Kokos
              </span>

            </div>

          </div>


          <div className="about-us-mini-card">

            <span>
              ♡
            </span>

            <div>

              <strong>
                Gjort med omtanke
              </strong>

              <p>
                Smaker som för människor samman.
              </p>

            </div>

          </div>

        </div>


        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="about-us-content">

          <span className="section-eyebrow">
            VÅR HISTORIA
          </span>


          <h2 id="about-us-title">
            Manila Café –
            <span> filippinska smaker i Göteborg</span>
          </h2>


          <p className="about-us-lead">
            För oss handlar dessert om mer än
            bara något sött efter maten.
          </p>


          <p>
            Manila Café skapades för att göra det enklare
            att upptäcka filippinska desserter och smaker
            här i Göteborg. Vi vill dela med oss av både
            klassiska favoriter och tropiska kombinationer
            som betyder mycket inom den filippinska
            matkulturen.
          </p>


          <p>
            Hos oss möter du smaker som mango, ube och
            kokos i desserter som Mango Float, Ube Cake,
            Fruit Cup och andra Filipino-favoriter.
            Desserterna kan beställas online för
            avhämtning eller leverans.
          </p>


          <p>
            Mat är en viktig del av gemenskapen i
            Filippinerna. Den delas med familj, vänner
            och gäster och blir en del av både vardag,
            firanden och minnen. Den känslan vill vi
            ta med oss till Manila Café.
          </p>


          <p>
            Oavsett om du redan älskar filippinska
            smaker eller letar efter en ny och annorlunda
            dessert att testa, vill vi ge dig möjlighet
            att upptäcka något nytt.
          </p>


          <div className="about-us-quote">

            <span
              className="quote-mark"
              aria-hidden="true"
            >
              “
            </span>

            <p>
              En liten smak av Filippinerna,
              mitt i Göteborg.
            </p>

          </div>

        </div>


      </div>

    </section>

  )

}


export default AboutUs