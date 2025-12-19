const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Token from header or body
    let token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token && req.body.token) {
      token = req.body.token; // req.body.token should be string
    }

    if (!token) {
      console.error("Auth Middleware: No token provided");
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Auth Middleware: Token decoded successfully", decoded);

    // Make sure we set user id correctly
    req.user = { 
      id: decoded.userId || decoded._id,
      _id: decoded.userId || decoded._id 
    }; 
    console.log("Auth Middleware: User set to", req.user);
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = authMiddleware;
