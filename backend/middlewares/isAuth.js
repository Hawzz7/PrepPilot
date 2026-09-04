import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const isAuth = async (req, res, next) => {
  try {
    // Get access token from cookies
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login.",
      });
    }

    // Verify access token
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    // Find user
    const user = await User.findById(decoded.userId).select("-refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error(error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
};

export default isAuth;
