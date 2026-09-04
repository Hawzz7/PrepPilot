import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";
import {
  analyzeResume,
  finishInterview,
  generateQuestions,
  submitAnswer,
  getInterviewHistory,
  getInterviewById,
  downloadInterviewPdf,
} from "../controllers/interview.controller.js";
import requireFeature from "../middlewares/requireFeature.js";

const interviewRouter = express.Router();

interviewRouter.post("/resume", isAuth, upload.single("resume"), analyzeResume);
interviewRouter.post("/generate-questions", isAuth, generateQuestions);
interviewRouter.post("/submit-answer", isAuth, submitAnswer);
interviewRouter.post("/finish", isAuth, finishInterview);
interviewRouter.get("/history", isAuth, getInterviewHistory);
interviewRouter.get("/history/:interviewId", isAuth, getInterviewById);
interviewRouter.get("/history/:interviewId/pdf", isAuth, downloadInterviewPdf);

export default interviewRouter;
