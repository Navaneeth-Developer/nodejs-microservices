const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");
const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logger.warn("No token provided");
    return res.status(401).json({ message: "Unauthorized", success: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    console.log("user=>", user);

    if (err) {
      logger.warn("Invalid token provided");
      return res.status(429).json({ message: "Forbidden", success: false });
    }
    req.user = user;
    next();
  });
};

module.exports = { validateToken };
