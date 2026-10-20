
import discountModel from "../models/discountModel.js";

// ======================================================
// RESERVE DISCOUNT
// ======================================================
// Reserverar en rabattkod atomiskt i MongoDB.
// Förhindrar att användningsgränsen överskrids
// av samtidiga reservationer.
// ======================================================

const reserveDiscount = async (
  discountId,
  mongoSession = null
) => {
  const now = new Date();

  const options = {
    new: true,
    ...(mongoSession ? { session: mongoSession } : {})
  };

  return discountModel.findOneAndUpdate(
    {
      _id: discountId,
      isActive: true,

      $and: [
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
          ]
        },
        {
          $expr: {
            $or: [
              { $eq: ["$usageLimit", null] },
              {
                $lt: [
                  {
                    $add: [
                      { $ifNull: ["$usedCount", 0] },
                      { $ifNull: ["$reservedCount", 0] }
                    ]
                  },
                  "$usageLimit"
                ]
              }
            ]
          }
        }
      ]
    },
    {
      $inc: {
        reservedCount: 1
      }
    },
    options
  );
};

// ======================================================
// RELEASE DISCOUNT
// ======================================================
// Frigör en tidigare reservation.
// Används när Stripe-sessionen löper ut
// eller när skapandet av betalningen misslyckas.
// ======================================================

const releaseDiscount = async (
  discountId,
  mongoSession = null
) => {
  const options = {
    new: true,
    ...(mongoSession ? { session: mongoSession } : {})
  };

  return discountModel.findOneAndUpdate(
    {
      _id: discountId,
      reservedCount: { $gt: 0 }
    },
    {
      $inc: {
        reservedCount: -1
      }
    },
    options
  );
};

// ======================================================
// REDEEM DISCOUNT
// ======================================================
// Förbrukar en reserverad rabattkod efter
// att Stripe har bekräftat betalningen.
// ======================================================

const redeemDiscount = async (
  discountId,
  mongoSession = null
) => {
  const options = {
    new: true,
    ...(mongoSession ? { session: mongoSession } : {})
  };

  return discountModel.findOneAndUpdate(
    {
      _id: discountId,
      reservedCount: { $gt: 0 }
    },
    {
      $inc: {
        reservedCount: -1,
        usedCount: 1
      }
    },
    options
  );
};

// ======================================================
// EXPORT
// ======================================================

export {
  reserveDiscount,
  releaseDiscount,
  redeemDiscount
};
