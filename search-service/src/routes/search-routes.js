const express = require("express");
const { searchPost } = require("../controllers/search-controller");
const { authenticateRequest } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateRequest);

router.get("/posts", searchPost);

module.exports = router;
