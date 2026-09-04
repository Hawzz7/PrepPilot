import mongoose, { Schema } from "mongoose";

const resumeChunkSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    candidateName: {
      type: String,
    },

    candidateRole: {
      type: String,
    },

    chunkIndex: {
      type: Number,
      required: true,
    },

    text: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const ResumeChunk = mongoose.model("ResumeChunk", resumeChunkSchema);

export default ResumeChunk;
