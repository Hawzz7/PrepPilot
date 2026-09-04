import {
  PLANS,
  FREE_FEATURES,
  PLAN_LEVELS,
} from "../config/plans.js";

// ==========================================
// CHECK WHETHER THE USER'S PLAN IS ACTIVE
// ==========================================

export const isPlanActive = (user) => {
  // Free plan doesn't expire
  if (!user.plan || user.plan === "free") {
    return true;
  }

  // Paid plan must have an expiry date
  if (!user.planExpiresAt) {
    return false;
  }

  return new Date(user.planExpiresAt) > new Date();
};

// ==========================================
// GET EFFECTIVE PLAN
// ==========================================

export const getEffectivePlan = (user) => {
  // Free user
  if (!user.plan || user.plan === "free") {
    return "free";
  }

  // Paid plan expired
  if (!isPlanActive(user)) {
    return "free";
  }

  return user.plan;
};

// ==========================================
// GET FEATURES AVAILABLE TO THE USER
// ==========================================

export const getUserFeatures = (user) => {
  const effectivePlan = getEffectivePlan(user);

  // Free features
  if (effectivePlan === "free") {
    return FREE_FEATURES;
  }

  // Paid plan features
  return PLANS[effectivePlan]?.features || FREE_FEATURES;
};

// ==========================================
// CHECK A SPECIFIC FEATURE
// ==========================================

export const hasFeature = (user, feature) => {
  const userFeatures = getUserFeatures(user);

  return userFeatures.includes(feature);
};

// ==========================================
// CHECK PLAN LEVEL
// ==========================================

export const getPlanLevel = (user) => {
  const effectivePlan = getEffectivePlan(user);

  return PLAN_LEVELS[effectivePlan] ?? 0;
};