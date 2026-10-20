
import discountModel from "../models/discountModel.js";

// Reservera en användning atomiskt.
// Anropas när en order ska få en Stripe-session.
const reserveDiscount = async (discountId) => {
  const now = new Date();

  const discount = await discountModel.findOneAndUpdate(
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
      $inc: { reservedCount: 1 }
    },
    {
      new: true
    }
  );

  return discount;
};

export { reserveDiscount };
