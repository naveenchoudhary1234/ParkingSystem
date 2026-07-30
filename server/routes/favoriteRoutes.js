const express = require("express");
const favoriteController = require("../controller/favoriteController");
const authMiddleware = require("../middlware/authMiddleware");
const router = express.Router();

// All routes require authentication
router.post("/add", authMiddleware, favoriteController.addFavorite);
router.delete("/remove/:propertyId", authMiddleware, favoriteController.removeFavorite);
router.get("/my-favorites", authMiddleware, favoriteController.getMyFavorites);
router.put("/:favoriteId/settings", authMiddleware, favoriteController.updateFavoriteSettings);
router.get("/check/:propertyId", authMiddleware, favoriteController.checkFavorite);

module.exports = router;
