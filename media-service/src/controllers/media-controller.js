const Media = require("../models/Media");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const uploadMedia = async (req, res) => {
  logger.info("Uploading media");
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded", success: false });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;
    logger.info("Filed details", originalname, mimetype, userId);
    logger.info("Uploading media to cloudinary");
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
    logger.info(`Cloudinary upload result: ${cloudinaryUploadResult}`);
    logger.info(`Cloudinary public Id: ${cloudinaryUploadResult.public_id}`);

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    res.status(201).json({
      message: "Media uploaded successfully",
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
    });
  } catch (error) {
    logger.error("Error uploading media", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { uploadMedia };
