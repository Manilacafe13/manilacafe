
import express from "express";
import { validateDiscount } from "../controllers/discountController.js";

const discountRouter = express.Router();

// Kontrollera rabattkod
discountRouter.post("/validate", validateDiscount);

export default discountRouter;
