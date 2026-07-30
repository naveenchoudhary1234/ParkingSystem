const User = require("../model/User");
const WalletTransaction = require("../model/WalletTransaction");
const ApiError = require("../util/ApiError");

// GET WALLET BALANCE
exports.getWalletBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('wallet');
    if (!user) return next(new ApiError(404, "User not found"));

    res.json({ 
      success: true, 
      balance: user.wallet || 0 
    });
  } catch (error) {
    console.error("Get Wallet Balance Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// GET WALLET TRANSACTIONS
exports.getWalletTransactions = async (req, res, next) => {
  try {
    const transactions = await WalletTransaction.find({ user: req.user.id })
      .populate('relatedBooking')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ 
      success: true, 
      transactions 
    });
  } catch (error) {
    console.error("Get Wallet Transactions Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};

// ADD MONEY TO WALLET (for testing or manual credits)
exports.addMoneyToWallet = async (req, res, next) => {
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return next(new ApiError(400, "Invalid amount"));
    }

    const user = await User.findById(req.user.id);
    if (!user) return next(new ApiError(404, "User not found"));

    user.wallet = (user.wallet || 0) + amount;
    await user.save();

    await WalletTransaction.create({
      user: user._id,
      type: "credit",
      amount,
      description: description || "Money added to wallet",
      balanceAfter: user.wallet,
      status: "completed"
    });

    res.json({ 
      success: true, 
      message: `₹${amount} added to wallet`,
      balance: user.wallet 
    });
  } catch (error) {
    console.error("Add Money to Wallet Error:", error);
    next(new ApiError(500, "Server Error"));
  }
};
