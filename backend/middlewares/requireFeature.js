import { hasFeature } from "../utils/planAccess.js";

const requireFeature = (feature) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized.",
        });
      }

      const allowed = hasFeature(user, feature);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `This feature requires a higher plan.`,
          feature,
          currentPlan: user.plan || "free",
        });
      }

      next();
    } catch (error) {
      console.error("Feature Access Error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to verify feature access.",
      });
    }
  };
};

export default requireFeature;