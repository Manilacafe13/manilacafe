import { Resend } from "resend";


// ======================================================
// HELPERS
// ======================================================

const escapeHtml = (value = "") => {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

};


const formatMoney = (value) => {

  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "sv-SE",
    {
      style: "currency",
      currency: "SEK"
    }
  ).format(amount);

};


const formatDate = (value) => {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "sv-SE",
    {
      timeZone:
        "Europe/Stockholm",

      year:
        "numeric",

      month:
        "long",

      day:
        "numeric"
    }
  ).format(date);

};


// ======================================================
// SEND ORDER CONFIRMATION
// ======================================================

const sendOrderConfirmation =
  async (order) => {

    // ==================================================
    // CONFIG
    // ==================================================

    if (
      !process.env.RESEND_API_KEY
    ) {

      throw new Error(
        "RESEND_API_KEY is missing"
      );

    }


    if (
      !process.env.ORDER_EMAIL_FROM
    ) {

      throw new Error(
        "ORDER_EMAIL_FROM is missing"
      );

    }


    if (!order) {

      throw new Error(
        "Order is missing"
      );

    }


    const customerEmail =
      String(
        order.address?.email || ""
      )
        .trim()
        .toLowerCase();


    if (!customerEmail) {

      throw new Error(
        "Customer email is missing"
      );

    }


    const resend =
      new Resend(
        process.env.RESEND_API_KEY
      );


    // ==================================================
    // ORDER INFORMATION
    // ==================================================

    const orderId =
      String(
        order._id || ""
      );


    const firstName =
      escapeHtml(
        order.address?.firstName || ""
      );


    const lastName =
      escapeHtml(
        order.address?.lastName || ""
      );


    const customerName =
      `${firstName} ${lastName}`.trim();


    const deliveryMethod =
      order.deliveryMethod === "pickup"
        ? "Avhämtning"
        : "Leverans";


    const requestedDate =
      formatDate(
        order.requestedDate
      );


    const requestedTime =
      escapeHtml(
        order.requestedTime || ""
      );


    // ==================================================
    // PRODUCTS
    // ==================================================

    const items =
      Array.isArray(order.items)
        ? order.items
        : [];


    const itemRows =
      items
        .map((item) => {

          const name =
            escapeHtml(
              item.name || ""
            );


          const quantity =
            Number(
              item.quantity || 0
            );


          const price =
            Number(
              item.price || 0
            );


          const rowTotal =
            quantity *
            price;


          return `
            <tr>
              <td style="
                padding: 12px 8px;
                border-bottom: 1px solid #eeeeee;
              ">
                ${name}
              </td>

              <td
                align="center"
                style="
                  padding: 12px 8px;
                  border-bottom: 1px solid #eeeeee;
                "
              >
                ${quantity}
              </td>

              <td
                align="right"
                style="
                  padding: 12px 8px;
                  border-bottom: 1px solid #eeeeee;
                "
              >
                ${formatMoney(rowTotal)}
              </td>
            </tr>
          `;

        })
        .join("");


    // ==================================================
    // DELIVERY ADDRESS
    // ==================================================

    let deliveryAddressHtml = "";


    if (
      order.deliveryMethod ===
      "delivery"
    ) {

      const street =
        escapeHtml(
          order.address?.street || ""
        );


      const zipcode =
        escapeHtml(
          order.address?.zipcode || ""
        );


      const city =
        escapeHtml(
          order.address?.city || ""
        );


      deliveryAddressHtml = `
        <div style="
          margin-top: 24px;
          padding: 18px;
          background: #f7f7f7;
          border-radius: 10px;
        ">

          <strong>
            Leveransadress
          </strong>

          <p style="
            margin: 8px 0 0 0;
            line-height: 1.6;
          ">
            ${street}<br>
            ${zipcode} ${city}
          </p>

        </div>
      `;

    }


    // ==================================================
    // HTML EMAIL
    // ==================================================

    const html = `
      <!doctype html>

      <html lang="sv">

        <body
          style="
            margin: 0;
            padding: 0;
            background: #f4f4f4;
            font-family: Arial, Helvetica, sans-serif;
            color: #262626;
          "
        >

          <div
            style="
              max-width: 650px;
              margin: 0 auto;
              padding: 30px 16px;
            "
          >

            <div
              style="
                background: #ffffff;
                border-radius: 14px;
                padding: 32px;
              "
            >

              <h1
                style="
                  margin-top: 0;
                  margin-bottom: 10px;
                  font-size: 28px;
                "
              >
                Tack för din beställning!
              </h1>


              <p
                style="
                  margin-top: 0;
                  line-height: 1.6;
                  color: #555555;
                "
              >
                Hej ${customerName},
                din betalning är genomförd och vi har tagit emot din beställning hos Manila Café.
              </p>


              <div
                style="
                  margin: 28px 0;
                  padding: 18px;
                  background: #f7f7f7;
                  border-radius: 10px;
                "
              >

                <p
                  style="
                    margin: 0 0 8px 0;
                  "
                >
                  <strong>Order-ID:</strong>
                  ${escapeHtml(orderId)}
                </p>

                <p
                  style="
                    margin: 0 0 8px 0;
                  "
                >
                  <strong>Mottagande:</strong>
                  ${deliveryMethod}
                </p>

                <p
                  style="
                    margin: 0 0 8px 0;
                  "
                >
                  <strong>Datum:</strong>
                  ${escapeHtml(requestedDate)}
                </p>

                <p
                  style="
                    margin: 0;
                  "
                >
                  <strong>Tid:</strong>
                  ${requestedTime}
                </p>

              </div>


              <h2
                style="
                  font-size: 20px;
                  margin-bottom: 12px;
                "
              >
                Din beställning
              </h2>


              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  border-collapse: collapse;
                "
              >

                <thead>

                  <tr>

                    <th
                      align="left"
                      style="
                        padding: 10px 8px;
                        border-bottom: 2px solid #262626;
                      "
                    >
                      Produkt
                    </th>

                    <th
                      align="center"
                      style="
                        padding: 10px 8px;
                        border-bottom: 2px solid #262626;
                      "
                    >
                      Antal
                    </th>

                    <th
                      align="right"
                      style="
                        padding: 10px 8px;
                        border-bottom: 2px solid #262626;
                      "
                    >
                      Summa
                    </th>

                  </tr>

                </thead>


                <tbody>
                  ${itemRows}
                </tbody>

              </table>


              <div
                style="
                  margin-top: 24px;
                "
              >

                <p
                  style="
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                  "
                >
                  <span>Delsumma</span>

                  <strong>
                    ${formatMoney(order.subtotal)}
                  </strong>
                </p>


                <p
                  style="
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                  "
                >
                  <span>Moms (6%)</span>

                  <strong>
                    ${formatMoney(order.vatAmount)}
                  </strong>
                </p>


                <p
                  style="
                    display: flex;
                    justify-content: space-between;
                    margin: 16px 0 0 0;
                    padding-top: 16px;
                    border-top: 2px solid #262626;
                    font-size: 18px;
                  "
                >

                  <strong>Totalt</strong>

                  <strong>
                    ${formatMoney(order.amount)}
                  </strong>

                </p>

              </div>


              ${deliveryAddressHtml}


              <div
                style="
                  margin-top: 28px;
                  padding-top: 22px;
                  border-top: 1px solid #eeeeee;
                "
              >

                <p
                  style="
                    margin: 0 0 8px 0;
                    line-height: 1.6;
                  "
                >
                  <strong>
                    Betalning:
                  </strong>
                  Genomförd
                </p>


                <p
                  style="
                    margin: 0;
                    line-height: 1.6;
                    color: #666666;
                  "
                >
                  Har du frågor om din beställning kan du kontakta Manila Café.
                </p>

              </div>


              <p
                style="
                  margin-top: 30px;
                  margin-bottom: 0;
                  color: #777777;
                  font-size: 13px;
                "
              >
                Manila Café Göteborg
              </p>

            </div>

          </div>

        </body>

      </html>
    `;


    // ==================================================
    // TEXT VERSION
    // ==================================================

    const textItems =
      items
        .map((item) => {

          const quantity =
            Number(
              item.quantity || 0
            );


          const total =
            Number(
              item.price || 0
            ) *
            quantity;


          return (
            `${item.name} × ${quantity} - ${formatMoney(total)}`
          );

        })
        .join("\n");


    const text = `
Tack för din beställning!

Hej ${order.address?.firstName || ""},

Din betalning är genomförd och vi har tagit emot din beställning hos Manila Café.

Order-ID: ${orderId}
Mottagande: ${deliveryMethod}
Datum: ${requestedDate}
Tid: ${order.requestedTime || ""}

DIN BESTÄLLNING

${textItems}

Delsumma: ${formatMoney(order.subtotal)}
Moms (6%): ${formatMoney(order.vatAmount)}
Totalt: ${formatMoney(order.amount)}

Betalning: Genomförd

Tack för att du beställer från Manila Café!
    `.trim();


    // ==================================================
    // SEND
    // ==================================================

    const {
      data,
      error
    } =
      await resend.emails.send(
        {

          from:
            process.env.ORDER_EMAIL_FROM,

          to:
            [customerEmail],

          subject:
            `Orderbekräftelse – Manila Café`,

          html,

          text

        },

        {
          idempotencyKey:
            `order-confirmation-${orderId}`
        }
      );


    if (error) {

      throw new Error(
        error.message ||
        "Order confirmation email could not be sent"
      );

    }


    return {
      success: true,
      id:
        data?.id || null
    };

  };


export {
  sendOrderConfirmation
};