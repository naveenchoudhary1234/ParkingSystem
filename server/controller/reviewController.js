const Review = require("../model/Review");
const Booking = require("../model/Booking");
const ParkingProperty = require("../model/ParkingProperty");
const ApiError = require("../util/ApiError");

// CREATE REVIEW
exports.createReview = async (req, res, next) => {
  try {
    const { 
      propertyId, 
      bookingId, 
      rating, 
      title, 
      comment,
      cleanliness,
      security,
      accessibility,
      valueForMoney,
      images 
    } = req.body;

    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new ApiError(404, "Booking not found"));
    }

    if (booking.user.toString() !== req.user.id) {
      return next(new ApiError(403, "Not authorized to review this booking"));
    }

    // Check if booking is completed
    if (booking.status !== 'confirmed' && booking.status !== 'completed') {
      return next(new ApiError(400, "Can only review completed bookings"));
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return next(new ApiError(400, "Already reviewed this booking"));
    }

    // Create review
    const review = await Review.create({
      user: req.user.id,
      property: propertyId,
      booking: bookingId,
      rating,
      title,
      comment,
      cleanliness,
      security,
      accessibility,
      valueForMoney,
      images: images || [],
      verified: true
    });

    // Update property average rating
    const avgData = await Review.calculateAverageRating(propertyId);
    await ParkingProperty.findByIdAndUpdate(propertyId, {
      averageRating: avgData.averageRating,
      totalReviews: avgData.totalReviews
    });

    res.status(201).json({ 
      success: true, 
      message: "Review submitted successfully",
      review 
    });
  } catch (error) {
    console.error("Create Review Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// GET PROPERTY REVIEWS
exports.getPropertyReviews = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { sort = 'recent', rating } = req.query;

    let sortOption = { createdAt: -1 };
    if (sort === 'highest') sortOption = { rating: -1, createdAt: -1 };
    if (sort === 'lowest') sortOption = { rating: 1, createdAt: -1 };
    if (sort === 'helpful') sortOption = { helpfulCount: -1, createdAt: -1 };

    const filter = { property: propertyId, isHidden: false };
    if (rating) filter.rating = parseInt(rating);

    const reviews = await Review.find(filter)
      .populate('user', 'name email')
      .sort(sortOption)
      .limit(50);

    const avgData = await Review.calculateAverageRating(propertyId);

    res.json({ 
      success: true, 
      reviews,
      stats: avgData
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// GET MY REVIEWS
exports.getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate('property', 'name address images')
      .sort({ createdAt: -1 });

    res.json({ success: true, reviews });
  } catch (error) {
    console.error("Get My Reviews Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// MARK REVIEW AS HELPFUL
exports.markHelpful = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) {
      return next(new ApiError(404, "Review not found"));
    }

    // Toggle helpful vote
    const hasVoted = review.helpfulVotes.includes(req.user.id);
    
    if (hasVoted) {
      review.helpfulVotes = review.helpfulVotes.filter(
        id => id.toString() !== req.user.id
      );
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      review.helpfulVotes.push(req.user.id);
      review.helpfulCount += 1;
    }

    await review.save();

    res.json({ success: true, helpfulCount: review.helpfulCount, hasVoted: !hasVoted });
  } catch (error) {
    console.error("Mark Helpful Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// OWNER RESPONSE
exports.ownerResponse = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;

    const review = await Review.findById(reviewId).populate('property');

    if (!review) {
      return next(new ApiError(404, "Review not found"));
    }

    // Check if user is owner of the property
    if (review.property.owner.toString() !== req.user.id) {
      return next(new ApiError(403, "Not authorized"));
    }

    review.ownerResponse = {
      text: response,
      respondedAt: new Date()
    };

    await review.save();

    res.json({ success: true, message: "Response posted successfully" });
  } catch (error) {
    console.error("Owner Response Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};
