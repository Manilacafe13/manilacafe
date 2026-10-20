import discountModel from "../models/discountModel.js";

// Atomic reservation; optional MongoDB transaction session.
export const reserveDiscount = (discountId, session = null) =>
  discountModel.findOneAndUpdate(
    {
      _id: discountId,
      isActive: true,
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] },
        {
          $expr: {
            $or: [
              { $eq: ["$usageLimit", null] },
              {
                $lt: [
                  { $add: [{ $ifNull: ["$usedCount", 0] }, { $ifNull: ["$reservedCount", 0] }] },
                  "$usageLimit"
                ]
              }
            ]
          }
        }
      ]
    },
    { $inc: { reservedCount: 1 } },
    { new: true, ...(session ? { session } : {}) }
  );

export const releaseDiscount = (discountId, session = null) =>
  discountModel.findOneAndUpdate(
    { _id: discountId, reservedCount: { $gt: 0 } },
    { $inc: { reservedCount: -1 } },
    { new: true, ...(session ? { session } : {}) }
  );

export const redeemDiscount = (discountId, session = null) =>
  discountModel.findOneAndUpdate(
    { _id: discountId, reservedCount: { $gt: 0 } },
    { $inc: { reservedCount: -1, usedCount: 1 } },
    { new: true, ...(session ? { session } : {}) }
  );