require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const proxy = require("express-http-proxy");

const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorhandler");

const app = express();
const PORT = process.env.PORT || 3000;

// Redis Client
const redisClient = new Redis(process.env.REDIS_URL);


// ================================
// Security Middleware
// ================================
app.use(helmet());
app.use(cors());
app.use(express.json());


// ================================
// Logger Middleware
// ================================
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request Body: ${JSON.stringify(req.body)}`);
  next();
});


// ================================
// Rate Limiter
// ================================
const rateLimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);

    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },

  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(rateLimitOptions);


// ================================
// Proxy Options
// ================================
const proxyOptions = {

  // Change /v1/auth/register
  // to
  // /api/auth/register
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },

  proxyErrorHandler: (err, res) => {
    logger.error(`Proxy Error: ${err}`);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err,
    });
  },
};


// ================================
// Identity Service Proxy
// ================================
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,

    proxyReqOptDecorator: (proxyReqOpts) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },

    userResDecorator: (proxyRes, proxyResData) => {
      logger.info(
        `Response received from Identity Service: ${proxyRes.statusCode}`
      );

      return proxyResData;
    },
  })
);


// ================================
// Global Error Handler
// ================================
app.use(errorHandler);


// ================================
// Start Server
// ================================
app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(`Identity Service URL: ${process.env.IDENTITY_SERVICE_URL}`);
  logger.info(`Redis URL: ${process.env.REDIS_URL}`);
});