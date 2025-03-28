const logger = require("../utils/logger");

const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  console.log("authReqUid", userId);

  if (!userId) {
    logger.warn("Access attempted without user Id");
    return res.status(400).json({
      success: false,
      message: "Authentication required, Please login to continue",
    });
  }
  req.user = {
    userId,
  };

  next();
};

module.exports = { authenticateRequest };
