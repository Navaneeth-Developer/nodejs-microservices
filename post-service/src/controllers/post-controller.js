const logger = require("../utils/logger");
const Post = require("../models/Post");
const { validateCreatePost } = require("../utils/validation");
const { publishEvent } = require("../utils/rabbitMQ");

const invalidatePostCache = async (req, input) => {
  const cacheKey = `post:${input}`;
  await req.redisClient.del(cacheKey);
  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
};

const createPost = async (req, res) => {
  logger.info("Creating post");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    const { content, mediaIds } = req.body;
    const newPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newPost.save();
    logger.info("Post created successfully", newPost._id);

    await publishEvent("post.created", {
      postId: newPost._id.toString(),
      userId: newPost.user.toString(),
      content: newPost.content,
      createdAt: newPost.createdAt,
    });

    await invalidatePostCache(req, newPost._id.toString());
    res.status(201).json({
      message: "Post created successfully",
      success: true,
    });
  } catch (error) {
    console.log("error==>>", error);

    logger.error("Error creating post", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `Posts: ${page}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts / limit),
      totalPosts,
    };

    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
    res.json(result);
  } catch (error) {
    logger.error("Error fetching posts", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching posts",
    });
  }
};
const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }
    const postDetailsById = await Post.findById(postId);
    if (!postDetailsById) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }
    await req.redisClient.setex(
      cacheKey,
      3600,
      JSON.stringify(postDetailsById)
    );
    res.json(postDetailsById);
  } catch (error) {
    logger.error("Error fetching post by ID", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error fetching post by ID",
    });
  }
};
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    await publishEvent("post.deleted", {
      postId: post._id,
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);

    res.json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting post", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting post",
    });
  }
};

module.exports = { createPost, getPost, deletePost, getAllPosts, deletePost };
