const logger = require("../utils/logger");
const User = require("../models/User");
const generateTokens = require("../utils/generateTokens");
const { validateRegistration, validateLogin } = require("../utils/validation");
const RefreshToken = require("../models/RefreshToken");

// User Registration

const registerUser = async (req, res) => {
  logger.info("Registering user");
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { email, password, username } = req.body;

    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      logger.warn("User already exists");
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    user = new User({
      email,
      password,
      username,
    });
    await user.save();
    logger.info("User registered successfully", user._id);

    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(201).json({
      success: true,
      message: "User Registered successfully",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Error registering user", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// login
const loginUser = async (req, res) => {
  logger.info("Login endpoint");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("User not found");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      logger.warn("Invalid password");
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);
    res.status(200).json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Error logging in user", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Refresh token
const refreshTokenController = async (req, res) => {
  logger.info("Refresh token endpoint");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token not provided");
      res.status(400).json({
        success: false,
        message: "Refresh token not provided",
      });
    }

    const storedToken = await RefreshToken.findOne({
      token: refreshToken,
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid refresh token");
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found");
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);
    await RefreshToken.deleteOne({ _id: storedToken._id });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("Error refreshing token", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const logout = async (req, res) => {
  logger.info("Logout endpoint");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token not provided");
      res.status(400).json({
        success: false,
        message: "Refresh token not provided",
      });
    }

    await RefreshToken.deleteOne({ token: refreshToken });
    res.json({ success: true, message: "User logged out successfully" });
  } catch (error) {
    logger.error("Error logging out user", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = { registerUser, loginUser, refreshTokenController, logout };
