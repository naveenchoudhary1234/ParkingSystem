const Favorite = require("../model/Favorite");
const ParkingProperty = require("../model/ParkingProperty");
const ApiError = require("../util/ApiError");

// ADD FAVORITE
exports.addFavorite = async (req, res, next) => {
  try {
    const { propertyId, nickname } = req.body;

    // Check if property exists
    const property = await ParkingProperty.findById(propertyId);
    if (!property) {
      return next(new ApiError(404, "Property not found"));
    }

    // Check if already favorited
    const existing = await Favorite.findOne({ 
      user: req.user.id, 
      property: propertyId 
    });

    if (existing) {
      return next(new ApiError(400, "Already in favorites"));
    }

    const favorite = await Favorite.create({
      user: req.user.id,
      property: propertyId,
      nickname: nickname || property.name
    });

    res.status(201).json({ 
      success: true, 
      message: "Added to favorites",
      favorite 
    });
  } catch (error) {
    console.error("Add Favorite Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// REMOVE FAVORITE
exports.removeFavorite = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const favorite = await Favorite.findOneAndDelete({ 
      user: req.user.id, 
      property: propertyId 
    });

    if (!favorite) {
      return next(new ApiError(404, "Favorite not found"));
    }

    res.json({ 
      success: true, 
      message: "Removed from favorites" 
    });
  } catch (error) {
    console.error("Remove Favorite Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// GET MY FAVORITES
exports.getMyFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .populate('property', 'name address images pricePerHour carSlots bikeSlots averageRating totalReviews')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      favorites 
    });
  } catch (error) {
    console.error("Get Favorites Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// UPDATE FAVORITE SETTINGS
exports.updateFavoriteSettings = async (req, res, next) => {
  try {
    const { favoriteId } = req.params;
    const { 
      nickname, 
      notifyOnAvailability, 
      notifyOnPriceChange, 
      notifyOnDiscount 
    } = req.body;

    const favorite = await Favorite.findOne({ 
      _id: favoriteId, 
      user: req.user.id 
    });

    if (!favorite) {
      return next(new ApiError(404, "Favorite not found"));
    }

    if (nickname !== undefined) favorite.nickname = nickname;
    if (notifyOnAvailability !== undefined) favorite.notifyOnAvailability = notifyOnAvailability;
    if (notifyOnPriceChange !== undefined) favorite.notifyOnPriceChange = notifyOnPriceChange;
    if (notifyOnDiscount !== undefined) favorite.notifyOnDiscount = notifyOnDiscount;

    await favorite.save();

    res.json({ 
      success: true, 
      message: "Favorite settings updated",
      favorite 
    });
  } catch (error) {
    console.error("Update Favorite Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// CHECK IF FAVORITED
exports.checkFavorite = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    const favorite = await Favorite.findOne({ 
      user: req.user.id, 
      property: propertyId 
    });

    res.json({ 
      success: true, 
      isFavorited: !!favorite,
      favoriteId: favorite?._id 
    });
  } catch (error) {
    console.error("Check Favorite Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};
