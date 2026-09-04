import { generateAccessToken, generateRefreshToken } from "../config/token.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

const setAuthCookies = (res, accessToken, refreshToken = null) => {
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
};

// Google authentication endpoint
export const googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validate request
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required.",
      });
    }

    // Find existing user
    let user = await User.findOne({ email });

    // If user doesn't exist, create a new user
    if (!user) {
      user = await User.create({ name, email });
    }

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in the database
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logged in Successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.credits,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// refresh token endpoint
export const refreshAccessToken = async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found.",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check refresh token stored in DB
    if (user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    // Set only access token cookie
    setAuthCookies(res, newAccessToken);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token.",
    });
  }
};

// Logout endpoint
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found.",
      });
    }

    // Verify Refresh Token
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find User
    const user = await User.findById(decoded.userId);

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    // Clear Cookies
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
