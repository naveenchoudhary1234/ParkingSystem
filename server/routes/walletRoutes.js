const express = require("express");
const walletController = require("../controller/walletController");
const authMiddleware = require("../middlware/authMiddleware");
const router = express.Router();

// Protected routes
router.get("/balance", authMiddleware, walletController.getWalletBalance);
router.get("/transactions", authMiddleware, walletController.getWalletTransactions);
router.post("/add", authMiddleware, walletController.addMoneyToWallet);

module.exports = router;
