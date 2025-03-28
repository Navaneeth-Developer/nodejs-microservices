const express = require("express");
const {
  registerUser,
  loginUser,
  refreshTokenController,
  logout,
} = require("../controllers/identity-controller");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refreshToken", refreshTokenController);
router.post("/logout", logout);

module.exports = router;
