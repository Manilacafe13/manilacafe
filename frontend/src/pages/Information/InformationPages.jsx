import React, { useEffect } from 'react'
import './InformationPages.css'


const InformationPage = ({
  title,
  intro,
  children
}) => {

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    })
  }, [])


  return (
    <main className="information-page">

      <div className="information-header">

        <span>
          MANILA CAFÉ
        </span>

        <h1>
          {title}
        </h1>

        {intro && (
          <p>
            {intro}
          </p>
        )}

      </div>


      <div className="information-content">
        {children}
      </div>

    </main>
  )
}


/* ====================================================== */
/* KÖPVILLKOR */
/* ====================================================== */

export const TermsPage = () => {

  return (
    <InformationPage
      title="Köpvillkor"
      intro="Villkor som gäller när du beställer från Manila Café."
    >

      <section>
        <h2>Priser och betalning</h2>

        <p>
          Alla priser på webbplatsen anges i svenska
          kronor inklusive moms.
        </p>

        <p>
          Betalning sker via Stripe med de
          betalningsalternativ som visas i kassan.
          Manila Café lagrar inte dina fullständiga
          kortuppgifter.
        </p>
      </section>


      <section>
        <h2>Beställning</h2>

        <p>
          Kontrollera produkter, antal, kontaktuppgifter,
          leverans- eller upphämtningsalternativ, datum
          och tid innan du genomför betalningen.
        </p>

        <p>
          När betalningen har genomförts registreras
          beställningen i vårt ordersystem.
        </p>
      </section>


      <section>
        <h2>Tillgänglighet</h2>

        <p>
          Produkter för beställning samma dag kan vara
          begränsade av vårt aktuella dagslager.
        </p>

        <p>
          Större beställningar eller beställningar för
          senare datum kan kräva längre framförhållning.
        </p>
      </section>


      <section>
        <h2>Livsmedel och ångerrätt</h2>

        <p>
          Våra desserter är färska livsmedel som kan
          försämras snabbt. Sådana produkter omfattas
          normalt inte av den lagstadgade 14 dagars
          ångerrätten.
        </p>

        <p>
          Detta påverkar inte din rätt att reklamera
          en produkt som är felaktig.
        </p>
      </section>


      <section>
        <h2>Reklamation</h2>

        <p>
          Om en produkt är felaktig, skadad, saknas
          eller inte motsvarar din beställning ska du
          kontakta oss så snart som möjligt.
        </p>

        <p>
          Vi bedömer därefter lämplig åtgärd, exempelvis
          ersättningsprodukt eller återbetalning.
        </p>
      </section>

    </InformationPage>
  )
}


/* ====================================================== */
/* AVBOKNING */
/* ====================================================== */

export const CancellationPage = () => {

  return (
    <InformationPage
      title="Avbokning & återbetalning"
      intro="Information om avbokningar, reklamationer och återbetalningar."
    >

      <section>
        <h2>Avbokning</h2>

        <p>
          Vill du avboka en beställning ska du kontakta
          Manila Café så snart som möjligt.
        </p>

        <p>
          Om produktionen ännu inte har påbörjats försöker
          vi avboka beställningen och återbetala betalningen.
        </p>

        <p>
          När produktionen av beställningen har påbörjats
          kan beställningen normalt inte längre avbokas.
        </p>
      </section>


      <section>
        <h2>Om vi behöver avboka</h2>

        <p>
          Om Manila Café behöver avboka en redan betald
          beställning återbetalas det belopp som avser
          den avbokade beställningen.
        </p>
      </section>


      <section>
        <h2>Fel på beställningen</h2>

        <p>
          Om du får fel produkt, om en produkt saknas
          eller om det finns ett fel på maten kan du
          reklamera beställningen.
        </p>

        <p>
          Kontakta oss så snart som möjligt och ange
          din orderinformation samt vad som har blivit fel.
        </p>
      </section>


      <section>
        <h2>Återbetalning</h2>

        <p>
          Godkända återbetalningar görs normalt till
          samma betalningsmetod som användes vid köpet.
        </p>
      </section>

    </InformationPage>
  )
}


/* ====================================================== */
/* LEVERANS */
/* ====================================================== */

export const DeliveryPage = () => {

  return (
    <InformationPage
      title="Leverans & upphämtning"
      intro="Så fungerar våra leverans- och upphämtningsalternativ."
    >

      <section>
        <h2>Val av tid</h2>

        <p>
          Vid beställning väljer du ett tillgängligt
          datum och tidsintervall.
        </p>

        <ul>
          <li>15:00–16:00</li>
          <li>16:00–17:00</li>
          <li>17:00–18:00</li>
          <li>18:00–19:00</li>
        </ul>
      </section>


      <section>
        <h2>Upphämtning</h2>

        <p>
          Vid upphämtning ansvarar kunden för att hämta
          beställningen under det valda tidsintervallet.
        </p>

        <p>
          Upphämtningsinformation och aktuell plats
          meddelas i samband med beställningen.
        </p>
      </section>


      <section>
        <h2>Leverans</h2>

        <p>
          Vid leverans ansvarar kunden för att ange
          korrekt namn, telefonnummer och leveransadress.
        </p>

        <p>
          Kunden behöver även vara nåbar under det
          valda leveransintervallet.
        </p>
      </section>


      <section>
        <h2>Förseningar</h2>

        <p>
          Vi försöker alltid hålla det valda
          tidsintervallet. Trafik, väder eller andra
          oförutsedda omständigheter kan dock orsaka
          förseningar.
        </p>

        <p>
          Vid ett större problem försöker vi kontakta
          kunden med hjälp av kontaktuppgifterna som
          lämnades vid beställningen.
        </p>
      </section>

    </InformationPage>
  )
}


/* ====================================================== */
/* INTEGRITET */
/* ====================================================== */

export const PrivacyPage = () => {

  return (
    <InformationPage
      title="Integritetspolicy"
      intro="Så behandlar Manila Café dina personuppgifter."
    >

      <section>
        <h2>Vilka uppgifter behandlar vi?</h2>

        <p>
          Vi kan behandla namn, e-postadress,
          telefonnummer, leveransadress,
          orderinformation, betalningsstatus och
          information som behövs för att ditt konto
          och dina beställningar ska fungera.
        </p>
      </section>


      <section>
        <h2>Varför behandlar vi uppgifterna?</h2>

        <p>
          Uppgifterna används för att administrera
          kundkonton, beställningar, betalningar,
          leveranser, upphämtningar och kundservice.
        </p>

        <p>
          Vissa uppgifter kan även behöva sparas för
          att Manila Café ska kunna uppfylla rättsliga
          skyldigheter.
        </p>
      </section>


      <section>
        <h2>Betalningar</h2>

        <p>
          Betalningar hanteras genom Stripe.
          Manila Café lagrar inte kundens fullständiga
          kortuppgifter.
        </p>
      </section>


      <section>
        <h2>Tjänsteleverantörer</h2>

        <p>
          Personuppgifter kan behandlas av våra
          tjänsteleverantörer när det krävs för
          exempelvis betalning, webbhosting,
          serverdrift och databaslagring.
        </p>
      </section>


      <section>
        <h2>Hur länge sparas uppgifterna?</h2>

        <p>
          Personuppgifter sparas inte längre än vad
          som är nödvändigt för det aktuella ändamålet.
        </p>

        <p>
          Uppgifter som behöver bevaras enligt
          bokförings- eller annan lagstiftning sparas
          under den tid lagen kräver.
        </p>
      </section>


      <section>
        <h2>Dina rättigheter</h2>

        <p>
          Du kan bland annat ha rätt att begära tillgång
          till dina personuppgifter, rättelse, radering
          eller begränsning av behandlingen.
        </p>

        <p>
          Kontakta oss om du har frågor om hur dina
          personuppgifter behandlas.
        </p>
      </section>


      <section>
        <h2>Kontakt om personuppgifter</h2>

        <p>
          E-post:
          {' '}
          <a href="mailto:manilacafe.goteborg@gmail.com">
            manilacafe.goteborg@gmail.com
          </a>
        </p>

        <p>
          Personuppgiftsansvarig:
          {' '}
          <strong>Manila Café</strong>
        </p>
      </section>

    </InformationPage>
  )
}


/* ====================================================== */
/* KONTAKT */
/* ====================================================== */

export const ContactPage = () => {

  return (
    <InformationPage
      title="Kontakt & företagsinformation"
      intro="Kontakta Manila Café om din beställning eller våra desserter."
    >

      <section>
        <h2>Manila Café</h2>

        <div className="information-contact">

          <div>
            <span>Telefon</span>

            <a href="tel:0762226393">
              076-222 63 93
            </a>
          </div>


          <div>
            <span>E-post</span>

            <a href="mailto:manilacafe.goteborg@gmail.com">
              manilacafe.goteborg@gmail.com
            </a>
          </div>


          <div>
            <span>Verksamhetsort</span>

            <strong>
              Göteborg
            </strong>
          </div>

        </div>
      </section>


      <section>
        <h2>Kundservice</h2>

        <p>
          Kontakta oss vid frågor om beställningar,
          leveranser, upphämtning, reklamationer,
          allergener eller personuppgifter.
        </p>
      </section>


      <section className="information-company-reminder">

        <h2>Företagsuppgifter</h2>

        <p>
          Registrerat företagsnamn, organisationsnummer
          och fysisk företagsadress kompletteras före
          lansering.
        </p>

      </section>

    </InformationPage>
  )
}