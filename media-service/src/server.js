require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mediaRoutes = require("./routes/media-routes");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const { handlePostDeleted } = require("./eventHandlers/media-event-handlers");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitMQ");

const app = express();
const PORT = process.env.PORT || 3003;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((error) => {
    console.log("Mongo error: ", error);

    logger.error("Error connecting to MongoDB", error.message);
  });

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  logger.info(`${req.body}`);
  next();
});

app.use("/api/media", mediaRoutes);
app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    //consume all the events
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(PORT, () => {
      logger.info(`Media service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server", error);
    process.exit(1);
  }
}

startServer();

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});
