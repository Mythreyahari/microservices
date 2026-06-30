const User = require("../models/User");
const generateTokens = require("../utils/generateToken");
const logger = require("../utils/logger");
const { validateRegistration } = require("../utils/validation");
// user registration
const registerUser = async (req, res) => {
  logger.info("Registration endpoint hits....");
  try {
    //   validate schema
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { username, email, password } = req.body;
    const Existinguser = await User.findOne({ $or: [{ username }, { email }] });
    if (Existinguser) {
      logger.warn("user is already exist....");
      return res.status(400).json({
        success: false,
        message: "user already exist",
      });
    }

    const user = await User.create({
      username,
      email,
      password,
    });
    // user = new User({  });
    // await user.save();
    logger.info(`user was saved successfully....,userid:${user._id}`);

    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(201).json({
      success: true,
      message: "user was registered successfully....",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// user login

// Refresh token

// logout

module.exports = { registerUser };
