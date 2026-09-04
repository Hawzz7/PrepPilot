import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    credits: {
      type: Number,
      default: 100,
    },
    plan: {
      type: String,
      enum: ["free", "starter", "pro"],
      default: "free",
    },
    planExpiresAt: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const user = mongoose.model("User", userSchema);
export default user;
