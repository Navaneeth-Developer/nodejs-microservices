const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPost = async (req, res) => {
  logger.info("Searching for posts");
  try {
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    res.json(results);
  } catch (error) {
    logger.error("Error searching for posts", error);
    res.status(500).json({
      success: false,
      message: "Error searching for posts",
    });
  }
};

module.exports = { searchPost };
