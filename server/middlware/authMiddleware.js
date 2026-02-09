const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {

    let token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token && req.body.token) {
      token = req.body.token; 
    }

    if (!token) {
      console.error("Auth Middleware: No token provided");
      const ApiError = require("../util/ApiError");
      return next(new ApiError(401, "Unauthorized access"));
    }

    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Auth Middleware: Token decoded successfully", decoded);

    
    req.user = { 
      id: decoded.userId || decoded._id,
      _id: decoded.userId || decoded._id 
    }; 
    console.log("Auth Middleware: User set to", req.user);
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    const ApiError = require("../util/ApiError");
    return next(new ApiError(401, "Token is not valid"));
  }
};

module.exports = authMiddleware;
