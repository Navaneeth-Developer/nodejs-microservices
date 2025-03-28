const express = require("express");
const multer = require("multer");

const { uploadMedia } = require("../controllers/media-controller");
const { authenticateRequest } = require("../middleware/authMiddleware");

const logger = require("../utils/logger");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error", err);
        return res
          .status(400)
          .json({ message: err.message, stack: err.stack, success: false });
      } else if (err) {
        logger.error("Error uploading media", err);
        return res
          .status(500)
          .json({ message: err.message, stack: err.stack, success: false });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ message: "No file uploaded", success: false });
      }

      next();
    });
  },
  uploadMedia
);

module.exports = router;
