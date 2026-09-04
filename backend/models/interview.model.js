import mongoose, { Schema } from "mongoose";
const questionsSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },

  difficulty: {
    type: String,
  },

  timeLimit: {
    type: Number,
    default: 60,
  },

  type: {
    type: String,
    enum: ["primary", "followup"],
    default: "primary",
  },

  score: {
    type: Number,
    default: 0,
  },

  confidence: {
    type: Number,
    default: 0,
  },

  communication: {
    type: Number,
    default: 0,
  },

  correctness: {
    type: Number,
    default: 0,
  },

  answer: {
    type: String,
    default: "",
  },

  feedback: {
    type: String,
    default: "",
  },
});

const interviewSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    experience: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["HR", "Technical"],
      required: true,
    },
    resumeText: {
      type: String,
    },
    questions: [questionsSchema],
    finalScore: { type: Number, default: 0 },
    advancedFeedback: {
      overallAssessment: {
        type: String,
        default: "",
      },

      strengths: {
        type: [String],
        default: [],
      },

      weaknesses: {
        type: [String],
        default: [],
      },

      recommendations: {
        type: [String],
        default: [],
      },
    },
    status: {
      type: String,
      enum: ["Incomplete", "Completed"],
      default: "Incomplete",
    },
  },
  {
    timestamps: true,
  },
);

const interview = mongoose.model("Interview", interviewSchema);
export default interview;
