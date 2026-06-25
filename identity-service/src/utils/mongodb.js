require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("../utils/logger");
const connectToDb = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => logger.info("Mongodb was connected successfully...."))
    .catch((e) => logger.error("mongodb connection error", e));
};

module.exports = { connectToDb };
