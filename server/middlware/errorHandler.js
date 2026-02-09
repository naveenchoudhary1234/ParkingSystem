const ApiError = require("../util/ApiError");

// Centralized Express error handler
function errorHandler(err, req, res, next) {
  console.error("Central Error Handler:", err.message || err);

  if (res.headersSent) return next(err);

  // If controller forwarded an ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // If fetch / network or other error with status
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Server temporarily unavailable";

  res.status(status).json({ success: false, message });
}

module.exports = errorHandler;
