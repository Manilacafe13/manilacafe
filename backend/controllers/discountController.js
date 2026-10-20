
import discountModel from "../models/discountModel.js";

// ======================================================
// VALIDATE DISCOUNT — CUSTOMER CHECKOUT
// ======================================================

const validateDiscount = async (req, res) => {
  try {
    const code = String(req.body.code || "")
      .trim()
      .toUpperCase();

    const subtotal = Number(req.body.subtotal);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Ange en rabattkod."
      });
    }

    if (
      !Number.isFinite(subtotal) ||
      subtotal <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Ogiltigt orderbelopp."
      });
    }

    const discount = await discountModel.findOne({
      code,
      isActive: true
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Rabattkoden är ogiltig."
      });
    }

    if (
      discount.expiresAt &&
      discount.expiresAt <= new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Rabattkoden har gått ut."
      });
    }

    if (
      discount.usageLimit !== null &&
      discount.usageLimit !== undefined &&
      discount.usedCount +
        discount.reservedCount >= discount.usageLimit
    ) {
      return res.status(400).json({
        success: false,
        message: "Rabattkoden har redan använts."
      });
    }

    if (subtotal < discount.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minsta orderbelopp är ${discount.minOrderAmount} kr.`
      });
    }

    let discountAmount = 0;

    if (discount.type === "percentage") {
      discountAmount =
        subtotal * (discount.value / 100);
    } else {
      discountAmount = discount.value;
    }

    discountAmount = Math.min(
      subtotal,
      Math.round(discountAmount * 100) / 100
    );

    return res.json({
      success: true,
      message: "Rabattkoden har lagts till.",
      discount: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount,
        newTotal:
          Math.round(
            (subtotal - discountAmount) * 100
          ) / 100
      }
    });
  } catch (error) {
    console.error("Validate discount error:", error);

    return res.status(500).json({
      success: false,
      message: "Kunde inte kontrollera rabattkoden."
    });
  }
};

// ======================================================
// CREATE DISCOUNT — ADMIN
// ======================================================

const createDiscount = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minOrderAmount = 0,
      usageLimit = null,
      expiresAt = null
    } = req.body;

    const normalizedCode = String(code || "")
      .trim()
      .toUpperCase();

    if (
      !normalizedCode ||
      normalizedCode.length > 50 ||
      !/^[A-Z0-9_-]+$/.test(normalizedCode)
    ) {
      return res.status(400).json({
        success: false,
        message: "Ange en giltig rabattkod."
      });
    }

    if (!["percentage", "fixed"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Ogiltig rabattyp."
      });
    }

    const numericValue = Number(value);
    const numericMinimum = Number(minOrderAmount);

    if (
      !Number.isFinite(numericValue) ||
      numericValue <= 0 ||
      (type === "percentage" && numericValue > 100) ||
      !Number.isFinite(numericMinimum) ||
      numericMinimum < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Ogiltigt rabattbelopp."
      });
    }

    let normalizedLimit = null;

    if (
      usageLimit !== null &&
      usageLimit !== undefined &&
      usageLimit !== ""
    ) {
      normalizedLimit = Number(usageLimit);

      if (
        !Number.isInteger(normalizedLimit) ||
        normalizedLimit < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Användningsgränsen måste vara ett positivt heltal."
        });
      }
    }

    let normalizedExpiry = null;

    if (expiresAt) {
      normalizedExpiry = new Date(expiresAt);

      if (
        Number.isNaN(normalizedExpiry.getTime()) ||
        normalizedExpiry <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Ange ett giltigt framtida utgångsdatum."
        });
      }
    }

    const discount = await discountModel.create({
      code: normalizedCode,
      type,
      value: numericValue,
      minOrderAmount: numericMinimum,
      usageLimit: normalizedLimit,
      expiresAt: normalizedExpiry,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: "Rabattkoden har skapats.",
      discount
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Rabattkoden finns redan."
      });
    }

    console.error("Create discount error:", error);

    return res.status(500).json({
      success: false,
      message: "Kunde inte skapa rabattkoden."
    });
  }
};

// ======================================================
// LIST DISCOUNTS — ADMIN
// ======================================================

const listDiscounts = async (req, res) => {
  try {
    const discounts = await discountModel
      .find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      discounts
    });
  } catch (error) {
    console.error("List discounts error:", error);

    return res.status(500).json({
      success: false,
      message: "Kunde inte hämta rabattkoder."
    });
  }
};

// ======================================================
// TOGGLE DISCOUNT — ADMIN
// ======================================================

const toggleDiscount = async (req, res) => {
  try {
    const discount = await discountModel.findById(
      req.params.id
    );

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: "Rabattkoden hittades inte."
      });
    }

    discount.isActive = !discount.isActive;

    await discount.save();

    return res.json({
      success: true,
      message: discount.isActive
        ? "Rabattkoden är aktiverad."
        : "Rabattkoden är inaktiverad.",
      discount
    });
  } catch (error) {
    console.error("Toggle discount error:", error);

    return res.status(500).json({
      success: false,
      message: "Kunde inte uppdatera rabattkoden."
    });
  }
};

export {
  validateDiscount,
  createDiscount,
  listDiscounts,
  toggleDiscount
};
