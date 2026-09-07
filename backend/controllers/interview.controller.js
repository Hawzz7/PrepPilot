import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi } from "../services/openRouter.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";
import ResumeChunk from "../models/resumeChunk.model.js";
import { generateEmbedding } from "../services/embedding.service.js";
import { createResumeChunks } from "../utils/createResumeChunks.js";
import {
  storeResumeEmbeddings,
  retrieveRelevantChunks,
  generateQuestionsWithRAG,
} from "../services/rag.service.js";
import { getEffectivePlan, hasFeature } from "../utils/planAccess.js";
import PDFDocument from "pdfkit";
import path from "path";

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Resume file is required.",
      });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const filePath = path.resolve(req.file.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Uploaded resume file was not found.",
      });
    }

    // Read uploaded PDF
    const fileBuffer = await fs.promises.readFile(filePath);
    const uint8Array = new Uint8Array(fileBuffer);

    // Load PDF
    const pdf = await pdfjsLib.getDocument({
      data: uint8Array,
    }).promise;

    let resumeText = "";

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const content = await page.getTextContent();

      const pageText = content.items.map((item) => item.str).join(" ");

      resumeText += pageText + "\n";
    }

    // Clean text
    resumeText = resumeText.replace(/\s+/g, " ").trim();

    const messages = [
      {
        role: "system",
        content: `
You are an expert resume parser.

Extract the resume into structured JSON.

Return ONLY valid JSON.

{
  "candidate": {
    "name": "",
    "email": "",
    "phone": "",
    "role": "",
     "experienceLevel": ""
  },

  "summary": "",

  "experience": [
    {
      "company": "",
      "designation": "",
      "duration": "",
      "description": ""
    }
  ],

  "projects": [
    {
      "title": "",
      "description": "",
      "technologies": []
    }
  ],

  "skills": [],

  "education": [
    {
      "degree": "",
      "institution": "",
      "year": ""
    }
  ],

  "certifications": []
}

Rules:

- Return valid JSON only.
- No markdown.
- No explanation.
- No code block.
- Preserve important resume details.
- Keep project descriptions detailed.

Determine the candidate's interview experience level.

Return exactly one of:

- Fresher
- 0-2 Years
- 2-5 Years
- 5-8 Years
- 8+ Years

Determine the interview experience level.

Do NOT calculate total years from dates alone.

Use all available evidence:

- Employment history
- Internships
- Project complexity
- Technologies used
- Resume summary
- Candidate role
- Overall engineering maturity

Return the experience level that best represents the level of interview the candidate should face.

Never leave experienceLevel empty.
`,
      },
      {
        role: "user",
        content: resumeText,
      },
    ];

    // AI Response
    const aiResponse = await askAi(messages);

    console.log("Raw AI Response:\n", aiResponse);

    // Remove markdown if present
    const cleanedResponse = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    // if (!parsed.candidate.experienceLevel) {
    //   parsed.candidate.experienceLevel = "Fresher";
    // }

    if (!parsed.candidate?.experienceLevel) {
      return res.status(422).json({
        message: "Unable to determine candidate experience level from resume.",
      });
    }

    // Delete uploaded PDF
    await storeResumeEmbeddings({
      user,
      parsedResume: parsed,
    });

    // Delete uploaded PDF after successful processing
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }

    console.log("====================================");
    console.log("Resume Indexed Successfully");
    console.log("Candidate:", parsed.candidate.name);
    console.log("Role:", parsed.candidate.role);
    console.log("Experience Level:", parsed.candidate.experienceLevel);
    console.log("====================================");

    console.log("========== PARSED RESUME ==========");
    console.log(JSON.stringify(parsed, null, 2));

    // return res.status(200).json({
    //   role: parsed.role,
    //   experience: parsed.experience,
    //   projects: parsed.projects,
    //   skills: parsed.skills,
    //   resumeText,
    // });

    return res.status(200).json({
      candidate: parsed.candidate,
      summary: parsed.summary,
      experience: parsed.experience,
      projects: parsed.projects,
      skills: parsed.skills,
      education: parsed.education,
      certifications: parsed.certifications,
      resumeText,
    });
  } catch (error) {
    console.error("Resume Analysis Error:", error);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch((cleanupError) => {
        console.error("Temporary file cleanup failed:", cleanupError);
      });
    }

    return res.status(500).json({
      message: error.message || "Resume analysis failed.",
    });
  }
};

export const generateQuestions = async (req, res) => {
  try {
    let { role, experience, mode } = req.body;

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();

    if (!role || !experience || !mode) {
      return res
        .status(400)
        .json({ message: "Role, Experience and Mode are required." });
    }

    const user = req.user;

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.credits < 50) {
      console.log("Credits Left: ", user.credits);
      return res.status(400).json({
        message: "Not enough credits. Minimum 50 credits required.",
      });
    }

    const questionsArray = await generateQuestionsWithRAG({
      userId: user._id,
      role,
      experience,
      mode,
      numberOfQuestions: 5,
    });

    console.log("========== RAG QUESTIONS ==========");
    console.log(questionsArray);

    user.credits -= 50;
    await user.save();

    const interview = await Interview.create({
      userId: user._id,
      role,
      experience,
      mode,
      questions: questionsArray.map((q) => ({
        question: q.question,
        difficulty: q.difficulty,
        timeLimit: q.timeLimit,
        type: q.type,
      })),
    });

    console.log("========== SAVED INTERVIEW ==========");
    console.log(JSON.stringify(interview, null, 2));

    return res.status(201).json({
      interviewId: interview._id,
      creditsLeft: user.credits,
      userName: user.name,
      questions: interview.questions,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: `failed to create interview ${error}`,
    });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer, timeTaken } = req.body;

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found.",
      });
    }

    const question = interview.questions[questionIndex];

    if (!question) {
      return res.status(400).json({
        message: "Question not found.",
      });
    }

    // =====================================================
    // NO ANSWER
    // =====================================================

    if (!answer || !answer.trim()) {
      question.score = 0;
      question.confidence = 0;
      question.communication = 0;
      question.correctness = 0;
      question.feedback = "You did not submit an answer.";
      question.answer = "";

      await interview.save();

      return res.status(200).json({
        feedback: question.feedback,
        hasFollowUp: false,
        questions: interview.questions,
      });
    }

    // =====================================================
    // TIME EXCEEDED
    // =====================================================

    if (timeTaken > question.timeLimit) {
      question.score = 0;
      question.confidence = 0;
      question.communication = 0;
      question.correctness = 0;
      question.feedback = "Time limit exceeded. Answer not evaluated.";
      question.answer = answer;

      await interview.save();

      return res.status(200).json({
        feedback: question.feedback,
        hasFollowUp: false,
        questions: interview.questions,
      });
    }

    // =====================================================
    // FOLLOW-UP ELIGIBILITY
    // =====================================================

    const totalQuestions = interview.questions.length;

    const canGenerateFollowUp =
      totalQuestions < 10 && question.type !== "followup";

    // =====================================================
    // AI EVALUATION
    // =====================================================

    const messages = [
      {
        role: "system",
        content: `
You are a professional human interviewer evaluating a candidate's answer in a real interview.

Evaluate naturally and fairly.

Score the answer in these areas from 0 to 10:

1. Confidence - Does the answer sound clear, confident, and well-presented?
2. Communication - Is the language simple, clear, and easy to understand?
3. Correctness - Is the answer accurate, relevant, and complete?

Rules:

- Be realistic and unbiased.
- Do not give random high scores.
- If the answer is weak, score low.
- If the answer is strong and detailed, score high.
- Consider clarity, structure, relevance, technical accuracy, and completeness.

Feedback rules:

- Write natural human feedback.
- 10 to 15 words only.
- Sound like real interview feedback.
- You may suggest improvement if needed.
- Do NOT repeat the question.
- Do NOT explain scoring.
- Keep the tone professional and honest.

Follow-up question rules:

A follow-up question is useful when the candidate's answer:

- Is vague or incomplete.
- Lacks important details.
- Makes a claim that should be explored further.
- Mentions an implementation or decision that deserves clarification.
- Gives a partially correct answer that can be explored deeper.
- Would benefit from a realistic interviewer probing further.

Do NOT generate a follow-up just to increase the number of questions.

Do NOT generate a follow-up when the candidate already gave a strong, complete answer.

If a follow-up is generated:

- It must be directly based on the candidate's answer.
- It must not repeat the original question.
- It must be a single complete sentence.
- Use natural conversational English.
- Make it sound like a real interviewer asking a deeper question.
- Keep it between 12 and 25 words.

Return ONLY valid JSON.

Return exactly this structure:

{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short human feedback",
  "shouldAskFollowUp": boolean,
  "followUpQuestion": "follow-up question or empty string"
}

If no follow-up is required:

"shouldAskFollowUp": false,
"followUpQuestion": ""
        `,
      },
      {
        role: "user",
        content: `
Original Question:
${question.question}

Candidate Answer:
${answer}

Interview Mode:
${interview.mode}

Question Type:
${question.type || "primary"}

Can Generate Follow-Up:
${canGenerateFollowUp}
        `,
      },
    ];

    console.log("========== ANSWER EVALUATION REQUEST ==========");

    console.log(JSON.stringify(messages, null, 2));

    const aiResponse = await askAi(messages);

    console.log("========== ANSWER EVALUATION RESPONSE ==========");

    console.log(aiResponse);

    const cleanedResponse = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    // =====================================================
    // SAVE EVALUATION
    // =====================================================

    question.answer = answer;
    question.confidence = parsed.confidence;
    question.communication = parsed.communication;
    question.correctness = parsed.correctness;
    question.score = parsed.finalScore;
    question.feedback = parsed.feedback;

    let followUpQuestion = null;

    // =====================================================
    // CREATE FOLLOW-UP
    // =====================================================

    if (
      canGenerateFollowUp &&
      parsed.shouldAskFollowUp === true &&
      parsed.followUpQuestion &&
      parsed.followUpQuestion.trim()
    ) {
      followUpQuestion = {
        question: parsed.followUpQuestion.trim(),

        difficulty: "medium",

        timeLimit: 60,

        type: "followup",

        score: 0,

        confidence: 0,

        communication: 0,

        correctness: 0,

        answer: "",

        feedback: "",
      };

      // Insert follow-up immediately after
      // the question that was just answered.
      interview.questions.splice(questionIndex + 1, 0, followUpQuestion);

      console.log("========== FOLLOW-UP GENERATED ==========");

      console.log(JSON.stringify(followUpQuestion, null, 2));
    }

    await interview.save();

    console.log("========== UPDATED QUESTION COUNT ==========");

    console.log(interview.questions.length);

    return res.status(200).json({
      feedback: parsed.feedback,

      hasFollowUp: !!followUpQuestion,

      followUpQuestion,

      questions: interview.questions,
    });
  } catch (error) {
    console.error("Submit Answer Error:", error);

    return res.status(500).json({
      message: `Failed to submit answer ${error.message}`,
    });
  }
};

//   try {
//     const { interviewId, questionIndex, answer, timeTaken } = req.body;
//     const interview = await Interview.findById(interviewId);
//     const question = interview.questions[questionIndex];

//     // If no answer provided
//     if (!answer) {
//       question.score = 0;
//       question.feedback = "You did not submit the answer.";
//       question.answer = "";

//       await interview.save();

//       return res.json({
//         feedback: question.feedback,
//       });
//     }

//     // If time exceeded
//     if (timeTaken > question.timeLimit) {
//       question.score = 0;
//       question.feedback = "Time limit exceeded. Answer not evaluated.";
//       question.answer = answer;

//       await interview.save();

//       return res.json({
//         feedback: question.feedback,
//       });
//     }

//     const messages = [
//       {
//         role: "system",
//         content: `
//         You are a professional human interviewer evaluating a candidate's answer in a real interview.

//         Evaluate naturally and fairly, like a real person would.

//         Score the answer in these areas (0 to 10):

//         1. Confidence - Does the answer sound clear, confident, and well-presented?
//         2. Communication - Is the language simple, clear, and easy to understand?
//         3. correctness - Is the answer accurate, relevant, and complete?

//         Rules:
//         - Be realistic and unbiased.
//         - Do not give random high scores.
//         - If the answer is weak, score low.
//         - If the answer is strong and detailed, score high.
//         - Consider clarity, structure, and relevance.

//         Calculate:
//         - Write natural human feedback.
//         - 10 to 15 words only.
//         - Sound like real interview feedback.
//         - Can suggest improvement if needed.
//         - Do NOT repeat the question.
//         - Do NOT explain scoring.
//         - Keep the tone professional and honest.

//         Return only valid JSON in this format:

//         {
//           "confidence": number,
//           "communication": number,
//           "correctness": number,
//           "finalScore": number,
//           "feedback": "short human feedback,
//         }
//         `,
//       },
//       {
//         role: "user",
//         content: `
//         Question: ${question.question}
//         Answer: ${answer}
//         `,
//       },
//     ];

//     const aiResponse = await askAi(messages);

//     const parsed = JSON.parse(aiResponse);

//     question.answer = answer;
//     question.confidence = parsed.confidence;
//     question.communication = parsed.communication;
//     question.correctness = parsed.correctness;
//     question.score = parsed.finalScore;
//     question.feedback = parsed.feedback;

//     await interview.save();

//     return res.status(200).json({
//       feedback: parsed.feedback,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: `failed to submit answer ${error}`,
//     });
//   }
// };

export const finishInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;

    // =====================================================
    // FIND INTERVIEW + VERIFY OWNERSHIP
    // =====================================================

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found.",
      });
    }

    // =====================================================
    // GET EFFECTIVE PLAN
    // =====================================================

    /*
     * Active Pro      → pro
     * Active Starter  → starter
     * Free            → free
     * Expired Pro     → free
     * Expired Starter → free
     */

    const effectivePlan = getEffectivePlan(req.user);

    const hasDetailedFeedback = hasFeature(req.user, "detailed_feedback");

    const hasPerformanceAnalytics = hasFeature(
      req.user,
      "performance_analytics",
    );

    const hasAdvancedFeedback = hasFeature(req.user, "advanced_feedback");

    const hasSkillTrends = hasFeature(req.user, "skill_trends");

    // =====================================================
    // BASIC COUNTS
    // =====================================================

    const totalQuestions = interview.questions.length;

    let answeredCount = 0;
    let skippedCount = 0;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    // =====================================================
    // FINALIZE EVERY QUESTION
    // =====================================================

    interview.questions.forEach((q) => {
      const hasAnswer =
        typeof q.answer === "string" && q.answer.trim().length > 0;

      // ===================================================
      // ANSWERED QUESTION
      // ===================================================

      if (hasAnswer) {
        answeredCount++;
      }

      // ===================================================
      // SKIPPED / UNANSWERED QUESTION
      // ===================================================

      if (!hasAnswer) {
        skippedCount++;

        q.answer = "";

        q.score = 0;

        q.confidence = 0;

        q.communication = 0;

        q.correctness = 0;

        q.feedback = "No answer was provided for this question.";
      }

      // ===================================================
      // ADD TO OVERALL TOTALS
      // ===================================================

      totalScore += Number(q.score) || 0;

      totalConfidence += Number(q.confidence) || 0;

      totalCommunication += Number(q.communication) || 0;

      totalCorrectness += Number(q.correctness) || 0;
    });

    // =====================================================
    // OVERALL SCORE
    // =====================================================

    const finalScore = totalQuestions > 0 ? totalScore / totalQuestions : 0;

    // =====================================================
    // AVERAGE PERFORMANCE
    // =====================================================

    const avgConfidence =
      totalQuestions > 0 ? totalConfidence / totalQuestions : 0;

    const avgCommunication =
      totalQuestions > 0 ? totalCommunication / totalQuestions : 0;

    const avgCorrectness =
      totalQuestions > 0 ? totalCorrectness / totalQuestions : 0;

    // =====================================================
    // PRIMARY / FOLLOW-UP COUNTS
    // =====================================================

    const primaryQuestions = interview.questions.filter(
      (q) => q.type === "primary",
    );

    const followUpQuestions = interview.questions.filter(
      (q) => q.type === "followup",
    );

    // =====================================================
    // DIFFICULTY ANALYTICS
    // =====================================================

    const calculateDifficultyScore = (difficulty) => {
      const difficultyQuestions = interview.questions.filter(
        (q) => q.difficulty?.toLowerCase() === difficulty,
      );

      if (!difficultyQuestions.length) {
        return 0;
      }

      const total = difficultyQuestions.reduce(
        (sum, q) => sum + (Number(q.score) || 0),
        0,
      );

      return total / difficultyQuestions.length;
    };

    const difficultyPerformance = {
      easy: Number(calculateDifficultyScore("easy").toFixed(1)),

      medium: Number(calculateDifficultyScore("medium").toFixed(1)),

      hard: Number(calculateDifficultyScore("hard").toFixed(1)),
    };

    // =====================================================
    // FOLLOW-UP ANALYTICS
    // =====================================================

    const followUpAverage =
      followUpQuestions.length > 0
        ? followUpQuestions.reduce(
            (sum, q) => sum + (Number(q.score) || 0),
            0,
          ) / followUpQuestions.length
        : 0;

    // =====================================================
    // QUESTION-WISE ANALYTICS
    // =====================================================

    const questionWiseScore = interview.questions.map((q, index) => ({
      questionNumber: index + 1,

      question: q.question,

      type: q.type || "primary",

      difficulty: q.difficulty || "medium",

      answer: q.answer || "",

      score: Number(q.score) || 0,

      confidence: Number(q.confidence) || 0,

      communication: Number(q.communication) || 0,

      correctness: Number(q.correctness) || 0,

      feedback: q.feedback || "",
    }));

    // =====================================================
    // PERFORMANCE TREND
    // =====================================================

    const performanceTrend = interview.questions.map((q, index) => ({
      questionNumber: index + 1,

      score: Number(q.score) || 0,
    }));

    // =====================================================
    // PRO - ADVANCED AI FEEDBACK
    // =====================================================

    let advancedFeedback = null;

    if (hasAdvancedFeedback) {
      const interviewSummary = interview.questions.map((q, index) => ({
        questionNumber: index + 1,
        question: q.question,
        type: q.type || "primary",
        difficulty: q.difficulty || "medium",
        answer: q.answer || "",
        score: Number(q.score) || 0,
        confidence: Number(q.confidence) || 0,
        communication: Number(q.communication) || 0,
        correctness: Number(q.correctness) || 0,
        feedback: q.feedback || "",
      }));

      const advancedMessages = [
        {
          role: "system",
          content: `
You are a senior professional interviewer analyzing a completed interview.

Provide a deeper interview-level assessment of the candidate.

Analyze:
- Overall interview performance
- Strengths demonstrated across the interview
- Weaknesses or recurring gaps
- Specific recommendations for improvement

Consider:
- Technical correctness
- Confidence
- Communication
- Completeness
- Consistency across answers
- Ability to explain concepts
- Quality of follow-up answers

Do not simply repeat the existing question-level feedback.

Be specific and actionable.

Return ONLY valid JSON.

Return exactly this structure:

{
  "overallAssessment": "string",
  "strengths": [
    "string",
    "string",
    "string"
  ],
  "weaknesses": [
    "string",
    "string",
    "string"
  ],
  "recommendations": [
    "string",
    "string",
    "string"
  ]
}

Rules:
- overallAssessment should be 40 to 70 words.
- Provide 2 to 4 strengths.
- Provide 2 to 4 weaknesses.
- Provide 2 to 4 actionable recommendations.
- Do not invent information that is not supported by the interview.
- Keep the assessment professional and honest.
      `,
        },

        {
          role: "user",
          content: `
Interview Role:
${interview.role}

Experience Level:
${interview.experience}

Interview Mode:
${interview.mode}

Overall Score:
${Number(finalScore.toFixed(1))}/10

Average Confidence:
${Number(avgConfidence.toFixed(1))}/10

Average Communication:
${Number(avgCommunication.toFixed(1))}/10

Average Correctness:
${Number(avgCorrectness.toFixed(1))}/10

Interview Questions and Evaluations:

${JSON.stringify(interviewSummary, null, 2)}
      `,
        },
      ];

      try {
        console.log("========== ADVANCED AI FEEDBACK REQUEST ==========");

        const aiResponse = await askAi(advancedMessages);

        console.log("========== ADVANCED AI FEEDBACK RESPONSE ==========");

        console.log(aiResponse);

        const cleanedResponse = aiResponse
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        advancedFeedback = JSON.parse(cleanedResponse);

        // Save to interview document
        interview.advancedFeedback = advancedFeedback;
      } catch (advancedError) {
        console.error("Advanced AI Feedback Error:", advancedError);

        // Do not fail the entire interview
        // just because the optional Pro analysis failed.
        advancedFeedback = null;
      }
    }

    // =====================================================
    // SAVE FINAL INTERVIEW RESULT
    // =====================================================

    interview.finalScore = Number(finalScore.toFixed(1));

    interview.status = "Completed";

    await interview.save();

    // =====================================================
    // BASIC RESPONSE
    // =====================================================

    const response = {
      success: true,

      message: "Interview completed successfully.",

      interviewId: interview._id,

      role: interview.role,

      experience: interview.experience,

      mode: interview.mode,

      plan: effectivePlan,

      finalScore: Number(finalScore.toFixed(1)),

      confidence: Number(avgConfidence.toFixed(1)),

      communication: Number(avgCommunication.toFixed(1)),

      correctness: Number(avgCorrectness.toFixed(1)),

      totalQuestions,

      answeredCount,

      skippedCount,

      primaryQuestionCount: primaryQuestions.length,

      followUpQuestionCount: followUpQuestions.length,

      status: interview.status,
    };

    // =====================================================
    // STARTER+ FEATURES
    // =====================================================

    if (hasDetailedFeedback) {
      response.followUpAverage = Number(followUpAverage.toFixed(1));
    }

    // =====================================================
    // PERFORMANCE ANALYTICS
    // =====================================================

    if (hasPerformanceAnalytics) {
      response.difficultyPerformance = difficultyPerformance;

      response.performanceTrend = performanceTrend;

      response.questionWiseScore = questionWiseScore;
    }

    // =====================================================
    // ADVANCED FEATURES
    // =====================================================

    if (hasAdvancedFeedback) {
      response.advancedFeedbackAvailable = !!advancedFeedback;

      response.advancedFeedback = advancedFeedback;
    }

    if (hasSkillTrends) {
      response.skillTrendsAvailable = true;
    }

    // =====================================================
    // SEND RESPONSE
    // =====================================================

    return res.status(200).json(response);
  } catch (error) {
    console.error("Finish Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to finish interview.",
    });
  }
};

export const getInterviewHistory = async (req, res) => {
  try {
    // =====================================================
    // AUTHENTICATED USER
    // =====================================================

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    // =====================================================
    // GET EFFECTIVE PLAN
    // =====================================================

    const effectivePlan = getEffectivePlan(req.user);

    // =====================================================
    // GET USER'S INTERVIEWS
    // =====================================================

    const interviews = await Interview.find({
      userId,
    })
      .select(
        "role experience mode finalScore status questions createdAt updatedAt",
      )
      .sort({
        createdAt: -1,
      });

    // =====================================================
    // FORMAT HISTORY
    // =====================================================

    const history = interviews.map((interview) => {
      const totalQuestions = interview.questions?.length || 0;

      const answeredQuestions =
        interview.questions?.filter(
          (question) => question.answer && question.answer.trim().length > 0,
        ).length || 0;

      const skippedQuestions = totalQuestions - answeredQuestions;

      const followUpQuestions =
        interview.questions?.filter((question) => question.type === "followup")
          .length || 0;

      return {
        interviewId: interview._id,

        role: interview.role,

        experience: interview.experience,

        mode: interview.mode,

        finalScore: Number(interview.finalScore) || 0,

        status: interview.status,

        totalQuestions,

        answeredQuestions,

        skippedQuestions,

        followUpQuestions,

        createdAt: interview.createdAt,

        updatedAt: interview.updatedAt,
      };
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,

      count: history.length,

      plan: effectivePlan,

      interviews: history,
    });
  } catch (error) {
    console.error("Get Interview History Error:", error);

    return res.status(500).json({
      success: false,

      message: error.message || "Failed to fetch interview history.",
    });
  }
};

export const getInterviewById = async (req, res) => {
  try {
    const { interviewId } = req.params;

    // =====================================================
    // FIND INTERVIEW
    // =====================================================

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found.",
      });
    }

    // =====================================================
    // GET EFFECTIVE PLAN
    // =====================================================

    const effectivePlan = getEffectivePlan(req.user);

    // =====================================================
    // FEATURE ACCESS
    // =====================================================

    const hasDetailedFeedback = hasFeature(req.user, "detailed_feedback");

    const hasPerformanceAnalytics = hasFeature(
      req.user,
      "performance_analytics",
    );

    const hasAdvancedFeedback = hasFeature(req.user, "advanced_feedback");

    const hasSkillTrends = hasFeature(req.user, "skill_trends");

    // =====================================================
    // BASIC QUESTION DATA
    // =====================================================

    const questions = interview.questions || [];

    const totalQuestions = questions.length;

    const answeredCount = questions.filter(
      (question) =>
        typeof question.answer === "string" &&
        question.answer.trim().length > 0,
    ).length;

    const skippedCount = totalQuestions - answeredCount;

    const primaryQuestionCount = questions.filter(
      (question) => question.type !== "followup",
    ).length;

    const followUpQuestionCount = questions.filter(
      (question) => question.type === "followup",
    ).length;

    // =====================================================
    // BASIC AVERAGES
    // =====================================================

    const calculateAverage = (values) => {
      if (!values.length) {
        return 0;
      }

      return (
        values.reduce((sum, value) => sum + (Number(value) || 0), 0) /
        values.length
      );
    };

    const confidence = calculateAverage(
      questions.map((question) => Number(question.confidence) || 0),
    );

    const communication = calculateAverage(
      questions.map((question) => Number(question.communication) || 0),
    );

    const correctness = calculateAverage(
      questions.map((question) => Number(question.correctness) || 0),
    );

    const finalScore =
      interview.finalScore !== undefined && interview.finalScore !== null
        ? Number(interview.finalScore)
        : calculateAverage(
            questions.map((question) => Number(question.score) || 0),
          );

    // =====================================================
    // BASIC RESPONSE
    // =====================================================

    const responseInterview = {
      interviewId: interview._id,

      role: interview.role,

      experience: interview.experience,

      mode: interview.mode,

      status: interview.status,

      plan: effectivePlan,

      finalScore: Number(finalScore.toFixed(1)),

      confidence: Number(confidence.toFixed(1)),

      communication: Number(communication.toFixed(1)),

      correctness: Number(correctness.toFixed(1)),

      totalQuestions,

      answeredCount,

      skippedCount,

      primaryQuestionCount,

      followUpQuestionCount,

      createdAt: interview.createdAt,

      updatedAt: interview.updatedAt,

      // ===================================================
      // FEATURE FLAGS
      // ===================================================

      features: {
        detailedFeedback: hasDetailedFeedback,

        performanceAnalytics: hasPerformanceAnalytics,

        advancedFeedback: hasAdvancedFeedback,

        skillTrends: hasSkillTrends,
      },
    };

    // =====================================================
    // STARTER+ DATA
    // =====================================================

    if (hasDetailedFeedback) {
      const followUpQuestions = questions.filter(
        (question) => question.type === "followup",
      );

      const followUpAverage = calculateAverage(
        followUpQuestions.map((question) => Number(question.score) || 0),
      );

      responseInterview.followUpAverage = Number(followUpAverage.toFixed(1));
    }

    // =====================================================
    // PERFORMANCE ANALYTICS
    // =====================================================

    if (hasPerformanceAnalytics) {
      // -----------------------------------------------
      // DIFFICULTY PERFORMANCE
      // -----------------------------------------------

      const calculateDifficultyScore = (difficulty) => {
        const difficultyQuestions = questions.filter(
          (question) => question.difficulty?.toLowerCase() === difficulty,
        );

        return calculateAverage(
          difficultyQuestions.map((question) => Number(question.score) || 0),
        );
      };

      responseInterview.difficultyPerformance = {
        easy: Number(calculateDifficultyScore("easy").toFixed(1)),

        medium: Number(calculateDifficultyScore("medium").toFixed(1)),

        hard: Number(calculateDifficultyScore("hard").toFixed(1)),
      };

      // -----------------------------------------------
      // PERFORMANCE TREND
      // -----------------------------------------------

      responseInterview.performanceTrend = questions.map((question, index) => ({
        questionNumber: index + 1,

        score: Number(question.score) || 0,
      }));

      // -----------------------------------------------
      // QUESTION-WISE ANALYSIS
      // -----------------------------------------------

      responseInterview.questionWiseScore = questions.map(
        (question, index) => ({
          questionNumber: index + 1,

          question: question.question || "",

          type: question.type || "primary",

          difficulty: question.difficulty || "medium",

          answer: question.answer || "",

          score: Number(question.score) || 0,

          confidence: Number(question.confidence) || 0,

          communication: Number(question.communication) || 0,

          correctness: Number(question.correctness) || 0,

          feedback: question.feedback || "",
        }),
      );
    }

    // =====================================================
    // ADVANCED AI FEEDBACK
    // =====================================================

    if (hasAdvancedFeedback && interview.advancedFeedback) {
      responseInterview.advancedFeedback = {
        overallAssessment: interview.advancedFeedback.overallAssessment || "",

        strengths: interview.advancedFeedback.strengths || [],

        weaknesses: interview.advancedFeedback.weaknesses || [],

        recommendations: interview.advancedFeedback.recommendations || [],
      };
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,

      interview: responseInterview,
    });
  } catch (error) {
    console.error("Get Interview By ID Error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch interview.",
    });
  }
};

export const downloadInterviewPdf = async (req, res) => {
  try {
    const { interviewId } = req.params;

    // =====================================================
    // FIND INTERVIEW + VERIFY OWNERSHIP
    // =====================================================

    const interview = await Interview.findOne({
      _id: interviewId,
      userId: req.user._id,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found.",
      });
    }

    // =====================================================
    // GET EFFECTIVE PLAN
    // =====================================================

    const effectivePlan = getEffectivePlan(req.user);

    // =====================================================
    // CHECK PDF ACCESS
    // =====================================================

    const canDownloadPdf =
      effectivePlan === "starter" || effectivePlan === "pro";

    if (!canDownloadPdf) {
      return res.status(403).json({
        success: false,
        message: "PDF reports are available from the Starter plan.",
        requiredPlan: "Starter",
      });
    }

    // =====================================================
    // BASIC DATA
    // =====================================================

    const questions = interview.questions || [];

    const totalQuestions = questions.length;

    const answeredCount = questions.filter(
      (question) =>
        typeof question.answer === "string" &&
        question.answer.trim().length > 0,
    ).length;

    const skippedCount = totalQuestions - answeredCount;

    const calculateAverage = (values) => {
      if (!values.length) {
        return 0;
      }

      return (
        values.reduce((sum, value) => sum + (Number(value) || 0), 0) /
        values.length
      );
    };

    const confidence = calculateAverage(
      questions.map((question) => question.confidence),
    );

    const communication = calculateAverage(
      questions.map((question) => question.communication),
    );

    const correctness = calculateAverage(
      questions.map((question) => question.correctness),
    );

    const finalScore =
      interview.finalScore !== undefined && interview.finalScore !== null
        ? Number(interview.finalScore)
        : calculateAverage(questions.map((question) => question.score));

    // =====================================================
    // FOLLOW-UP DATA
    // =====================================================

    const followUpQuestions = questions.filter(
      (question) => question.type === "followup",
    );

    const followUpAverage = calculateAverage(
      followUpQuestions.map((question) => question.score),
    );

    // =====================================================
    // DIFFICULTY DATA
    // =====================================================

    const calculateDifficultyScore = (difficulty) => {
      const difficultyQuestions = questions.filter(
        (question) => question.difficulty?.toLowerCase() === difficulty,
      );

      return calculateAverage(
        difficultyQuestions.map((question) => question.score),
      );
    };

    const difficultyPerformance = {
      easy: calculateDifficultyScore("easy"),
      medium: calculateDifficultyScore("medium"),
      hard: calculateDifficultyScore("hard"),
    };

    // =====================================================
    // RESPONSE HEADERS
    // =====================================================

    const fileName = `${interview.role
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()}-interview-report.pdf`;

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    // =====================================================
    // CREATE PDF
    // =====================================================

    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    doc.pipe(res);

    // =====================================================
    // HEADER
    // =====================================================

    doc.fontSize(24).font("Helvetica-Bold").text("PrepPilot", {
      align: "center",
    });

    doc.fontSize(18).text("AI Interview Report", {
      align: "center",
    });

    doc.moveDown();

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Role: ${interview.role || "N/A"}`);

    doc.text(`Experience: ${interview.experience || "N/A"}`);

    doc.text(`Interview Mode: ${interview.mode || "N/A"}`);

    doc.text(`Plan: ${effectivePlan.toUpperCase()}`);

    doc.text(`Status: ${interview.status || "N/A"}`);

    doc.moveDown();

    // =====================================================
    // OVERALL SCORE
    // =====================================================

    doc.fontSize(16).font("Helvetica-Bold").text("Overall Performance");

    doc.moveDown(0.5);

    doc
      .fontSize(14)
      .font("Helvetica")
      .text(`Overall Score: ${finalScore.toFixed(1)}/10`);

    doc.text(`Confidence: ${confidence.toFixed(1)}/10`);

    doc.text(`Communication: ${communication.toFixed(1)}/10`);

    doc.text(`Correctness: ${correctness.toFixed(1)}/10`);

    doc.moveDown();

    // =====================================================
    // INTERVIEW STATISTICS
    // =====================================================

    doc.fontSize(16).font("Helvetica-Bold").text("Interview Statistics");

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Total Questions: ${totalQuestions}`);

    doc.text(`Answered: ${answeredCount}`);

    doc.text(`Skipped: ${skippedCount}`);

    doc.text(`Follow-up Questions: ${followUpQuestions.length}`);

    if (followUpQuestions.length > 0) {
      doc.text(`Follow-up Average: ${followUpAverage.toFixed(1)}/10`);
    }

    doc.moveDown();

    // =====================================================
    // DIFFICULTY PERFORMANCE
    // =====================================================

    doc.fontSize(16).font("Helvetica-Bold").text("Difficulty Performance");

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Easy: ${difficultyPerformance.easy.toFixed(1)}/10`);

    doc.text(`Medium: ${difficultyPerformance.medium.toFixed(1)}/10`);

    doc.text(`Hard: ${difficultyPerformance.hard.toFixed(1)}/10`);

    doc.moveDown();

    // =====================================================
    // QUESTION ANALYSIS
    // =====================================================

    doc.fontSize(16).font("Helvetica-Bold").text("Question Analysis");

    doc.moveDown();

    questions.forEach((question, index) => {
      // Prevent content from getting cut off
      if (doc.y > 700) {
        doc.addPage();
      }

      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(`Q${index + 1}. ${question.question || ""}`);

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          `Type: ${question.type === "followup" ? "Follow-up" : "Primary"}`,
        );

      doc.text(`Difficulty: ${question.difficulty || "Medium"}`);

      doc.text(`Score: ${Number(question.score || 0).toFixed(1)}/10`);

      doc.text(`Confidence: ${Number(question.confidence || 0).toFixed(1)}/10`);

      doc.text(
        `Communication: ${Number(question.communication || 0).toFixed(1)}/10`,
      );

      doc.text(
        `Correctness: ${Number(question.correctness || 0).toFixed(1)}/10`,
      );

      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("Candidate Answer:");

      doc
        .font("Helvetica")
        .text(
          question.answer?.trim() ? question.answer : "No answer was provided.",
        );

      doc.moveDown(0.3);

      doc.font("Helvetica-Bold").text("AI Feedback:");

      doc.font("Helvetica").text(question.feedback || "No feedback available.");

      doc.moveDown();
    });

    // =====================================================
    // PRO - ADVANCED AI FEEDBACK
    // =====================================================

    if (effectivePlan === "pro" && interview.advancedFeedback) {
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fontSize(18).font("Helvetica-Bold").text("Advanced AI Feedback");

      doc.moveDown();

      const advancedFeedback = interview.advancedFeedback;

      doc.fontSize(13).font("Helvetica-Bold").text("Overall Assessment");

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          advancedFeedback.overallAssessment ||
            "No overall assessment available.",
        );

      doc.moveDown();

      doc.fontSize(13).font("Helvetica-Bold").text("Strengths");

      (advancedFeedback.strengths || []).forEach((strength) => {
        doc.fontSize(10).font("Helvetica").text(`• ${strength}`);
      });

      doc.moveDown();

      doc.fontSize(13).font("Helvetica-Bold").text("Areas for Improvement");

      (advancedFeedback.weaknesses || []).forEach((weakness) => {
        doc.fontSize(10).font("Helvetica").text(`• ${weakness}`);
      });

      doc.moveDown();

      doc.fontSize(13).font("Helvetica-Bold").text("Recommendations");

      (advancedFeedback.recommendations || []).forEach((recommendation) => {
        doc.fontSize(10).font("Helvetica").text(`• ${recommendation}`);
      });
    }

    // =====================================================
    // FOOTER
    // =====================================================

    doc
      .moveDown(2)
      .fontSize(9)
      .font("Helvetica")
      .text("Generated by PrepPilot AI Interview Platform", {
        align: "center",
      });

    // =====================================================
    // FINISH PDF
    // =====================================================

    doc.end();
  } catch (error) {
    console.error("Download Interview PDF Error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate PDF report.",
      });
    }
  }
};

// export const finishInterview = async (req, res) => {
//   try {
//     const { interviewId } = req.body;

//     const interview = await Interview.findById(interviewId);

//     if (!interview) {
//       return res.status(404).json({
//         message: "Failed to find interview",
//       });
//     }

//     // =====================================================
//     // BASIC COUNTS
//     // =====================================================

//     const totalQuestions = interview.questions.length;

//     const answeredQuestions = interview.questions.filter(
//       (q) => q.answer && q.answer.trim(),
//     );

//     const answeredCount = answeredQuestions.length;

//     const skippedCount = totalQuestions - answeredCount;

//     const primaryQuestions = interview.questions.filter(
//       (q) => q.type === "primary",
//     );

//     const followUpQuestions = interview.questions.filter(
//       (q) => q.type === "followup",
//     );

//     // =====================================================
//     // OVERALL SCORES
//     // =====================================================

//     let totalScore = 0;
//     let totalConfidence = 0;
//     let totalCommunication = 0;
//     let totalCorrectness = 0;

//     interview.questions.forEach((q) => {
//       totalScore += q.score || 0;
//       totalConfidence += q.confidence || 0;
//       totalCommunication += q.communication || 0;
//       totalCorrectness += q.correctness || 0;
//     });

//     const finalScore =
//       totalQuestions > 0
//         ? totalScore / totalQuestions
//         : 0;

//     const avgConfidence =
//       totalQuestions > 0
//         ? totalConfidence / totalQuestions
//         : 0;

//     const avgCommunication =
//       totalQuestions > 0
//         ? totalCommunication / totalQuestions
//         : 0;

//     const avgCorrectness =
//       totalQuestions > 0
//         ? totalCorrectness / totalQuestions
//         : 0;

//     // =====================================================
//     // DIFFICULTY ANALYTICS
//     // =====================================================

//     const calculateDifficultyScore = (difficulty) => {
//       const difficultyQuestions =
//         interview.questions.filter(
//           (q) =>
//             q.difficulty?.toLowerCase() ===
//             difficulty,
//         );

//       if (!difficultyQuestions.length) {
//         return 0;
//       }

//       const total = difficultyQuestions.reduce(
//         (sum, q) => sum + (q.score || 0),
//         0,
//       );

//       return total / difficultyQuestions.length;
//     };

//     const difficultyPerformance = {
//       easy: Number(
//         calculateDifficultyScore("easy").toFixed(1),
//       ),

//       medium: Number(
//         calculateDifficultyScore("medium").toFixed(1),
//       ),

//       hard: Number(
//         calculateDifficultyScore("hard").toFixed(1),
//       ),
//     };

//     // =====================================================
//     // FOLLOW-UP ANALYTICS
//     // =====================================================

//     const followUpAverage =
//       followUpQuestions.length > 0
//         ? followUpQuestions.reduce(
//             (sum, q) => sum + (q.score || 0),
//             0,
//           ) / followUpQuestions.length
//         : 0;

//     // =====================================================
//     // QUESTION-WISE ANALYTICS
//     // =====================================================

//     const questionWiseScore =
//       interview.questions.map(
//         (q, index) => ({
//           questionNumber: index + 1,

//           question: q.question,

//           type: q.type || "primary",

//           difficulty:
//             q.difficulty || "medium",

//           score: q.score || 0,

//           confidence:
//             q.confidence || 0,

//           communication:
//             q.communication || 0,

//           correctness:
//             q.correctness || 0,

//           answer: q.answer || "",

//           feedback: q.feedback || "",
//         }),
//       );

//     // =====================================================
//     // PERFORMANCE TREND
//     // =====================================================

//     const performanceTrend =
//       interview.questions.map(
//         (q, index) => ({
//           questionNumber: index + 1,
//           score: q.score || 0,
//         }),
//       );

//     // =====================================================
//     // SAVE FINAL RESULT
//     // =====================================================

//     interview.finalScore = Number(
//       finalScore.toFixed(1),
//     );

//     // IMPORTANT:
//     // Schema enum is "Completed", not "completed".
//     interview.status = "Completed";

//     await interview.save();

//     // =====================================================
//     // RESPONSE
//     // =====================================================

//     return res.status(200).json({
//       success: true,

//       interviewId: interview._id,

//       role: interview.role,

//       experience: interview.experience,

//       mode: interview.mode,

//       finalScore: Number(
//         finalScore.toFixed(1),
//       ),

//       confidence: Number(
//         avgConfidence.toFixed(1),
//       ),

//       communication: Number(
//         avgCommunication.toFixed(1),
//       ),

//       correctness: Number(
//         avgCorrectness.toFixed(1),
//       ),

//       totalQuestions,

//       answeredCount,

//       skippedCount,

//       primaryQuestionCount:
//         primaryQuestions.length,

//       followUpQuestionCount:
//         followUpQuestions.length,

//       followUpAverage: Number(
//         followUpAverage.toFixed(1),
//       ),

//       difficultyPerformance,

//       performanceTrend,

//       questionWiseScore,

//       status: interview.status,
//     });
//   } catch (error) {
//     console.error(
//       "Finish Interview Error:",
//       error,
//     );

//     return res.status(500).json({
//       message: `Failed to finish interview: ${error.message}`,
//     });
//   }
// };

// export const analyzeResume = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: "Resume required" });
//     }
//     const filepath = req.file.path;

//     const fileBuffer = await fs.promises.readFile(filepath);
//     const uint8Array = new Uint8Array(fileBuffer);

//     const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

//     let resumeText = "";

//     // Extract text from all pages
//     for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//       const page = await pdf.getPage(pageNum);
//       const content = await page.getTextContent();

//       const pageText = content.items.map((item) => item.str).join(" ");
//       resumeText += pageText + "\n";

//       resumeText = resumeText.replace(/\s+/g, " ").trim();

//       const messages = [
//         {
//           role: "system",
//           content: `
//             Extract structured data from resume.

//             Return strictly JSON:
//             {
//             "role": "string"
//             "experience": "string",
//             "projects", ["project1", "project2"],
//             "skills": ["skills1", "skills2"]
//             }
//             `,
//         },
//         {
//           role: "user",
//           content: resumeText,
//         },
//       ];

//       const aiResponse = await askAi(messages);
//       const parsed = JSON.parse(aiResponse);
//       fs.unlinkSync(filepath);

//       res.json({
//         role: parsed.role,
//         experience: parsed.experience,
//         projects: parsed.projects,
//         skills: parsed.skills,
//         resumeText,
//       });
//     }
//   } catch (error) {
//     console.error(error);

//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }

//     res.status(500).json({ message: error.message });
//   }
// }
