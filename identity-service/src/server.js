require("dotenv").config();
const express = require("express");
const logger = require("./utils/logger");
const { connectToDb } = require("./utils/mongodb");
const helmet = require("helmet");
const cors = require("cors");
const app = express();
// connect the database
connectToDb();

// middleware
app.use(helmet());
app.use(cors);
app.use(express.json());
app.use((req, res, next) => {
  logger.info(`Received ${req.method} req to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});
