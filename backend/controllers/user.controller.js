import User from "../models/user.model.js";

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: "Unauthorized. Please login.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user: req.user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
