export const PLANS = {
  starter: {
    name: "Starter Pack",
    amount: 100,
    credits: 150,
    durationDays: 30,
    level: 1,

    features: [
      "basic_report",
      "voice_interview",
      "full_history",
      "detailed_feedback",
      "performance_analytics",
    ],
  },

  pro: {
    name: "Pro Pack",
    amount: 500,
    credits: 650,
    durationDays: 30,
    level: 2,

    features: [
      "basic_report",
      "voice_interview",
      "full_history",
      "detailed_feedback",
      "performance_analytics",
      "advanced_feedback",
      "skill_trends",
      "priority_processing",
    ],
  },
};

export const FREE_FEATURES = [
  "basic_report",
  "voice_interview",
  "limited_history",
];

export const PLAN_LEVELS = {
  free: 0,
  starter: 1,
  pro: 2,
};