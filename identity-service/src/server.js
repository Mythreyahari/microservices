require("dotenv").config();
const express = require("express");
const logger = require("./utils/logger");
const { connectToDb } = require("./utils/mongodb");
const helmet = require("helmet");
const cors = require("cors");
const app = express();
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const {RedisStore} = require("rate-limit-redis")
// connect the database
connectToDb();

// Redis
const redisClient = new Redis(process.env.REDIS_URL);

// middleware
app.use(helmet());
app.use(cors);
app.use(express.json());
app.use((req, res, next) => {
  logger.info(`Received ${req.method} req to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

// Ddos protection and rate limitting
const rateLimitter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimitter
    .consume(req.ip)
    .then(() => next())
    .catch((e) => {
      logger.warn(`Rate limitter exceeded to the ip:${req.ip}`);
      return res.status(429).json({
        succees: false,
        message: "Too many requests",
      });
    });
});

const sensitiveEndpointsLimitter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`sensitive rate limit exceeded for ip:${req.ip}`);
    return res.status(429).json({
      succees: false,
      message: "Too many requests",
    });
  },
  store:new RedisStore({
    sendCommand:(...args)=>redisClient.call(...args)
  })
});
 



