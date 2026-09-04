import { motion } from "motion/react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { BsArrowLeft } from "react-icons/bs";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine,
  FaBullseye,
  FaComments,
  FaBrain,
  FaQuestionCircle,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
} from "react-icons/fa";
import axiosInstance from "../services/axiosInstance.js";
import LockedFeature from "./LockedFeature.jsx";

const Step3Report = ({ reportData }) => {
  const navigate = useNavigate();

  // =========================================================
  // HISTORY INTERVIEW ID
  // =========================================================

  const { interviewId } = useParams();

  // =========================================================
  // HISTORICAL REPORT STATE
  // =========================================================

  const [historicalReport, setHistoricalReport] = useState(null);

  const [loading, setLoading] = useState(false);

  const [reportError, setReportError] = useState("");

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // =========================================================
  // FETCH HISTORICAL INTERVIEW
  // =========================================================

  useEffect(() => {
    // Fresh interview already has reportData.
    if (reportData) {
      return;
    }

    // No interview ID means there is nothing
    // to fetch.
    if (!interviewId) {
      return;
    }

    const fetchHistoricalReport = async () => {
      try {
        setLoading(true);
        setReportError("");

        console.log("========== FETCHING HISTORICAL REPORT ==========");

        console.log("Interview ID:", interviewId);

        const { data } = await axiosInstance.get(
          `/api/interview/history/${interviewId}`,
        );

        console.log("========== HISTORICAL REPORT RESPONSE ==========");

        console.log(data);

        console.log("========== ADVANCED FEEDBACK ==========");
        console.log(data.interview?.advancedFeedback);

        console.log("========== PLAN ==========");
        console.log(data.interview?.plan);

        console.log("========== FEATURES ==========");
        console.log(data.interview?.features);

        setHistoricalReport(data.interview);
      } catch (error) {
        console.error(
          "Failed to load historical report:",
          error.response?.data || error.message,
        );

        setReportError(
          error.response?.data?.message || "Failed to load interview report.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalReport();
  }, [interviewId, reportData]);

  // =========================================================
  // SELECT REPORT SOURCE
  // =========================================================

  const sourceReport = reportData || historicalReport;

  // =========================================================
  // PLAN FEATURE ACCESS
  // =========================================================

  // The backend feature flags are the source of truth.
  // If an older report does not contain feature flags, fall back to
  // the plan stored on the report so Starter/Pro reports still render
  // correctly.
  const features = sourceReport?.features || {};
  const hasFeatureConfig =
    sourceReport?.features && typeof sourceReport.features === "object";

  const plan = String(sourceReport?.plan || "").toLowerCase();

  const canDownloadPdf = plan === "starter" || plan === "pro";

  const canViewDetailedFeedback = hasFeatureConfig
    ? features.detailedFeedback === true
    : plan === "starter" || plan === "pro";

  const canViewPerformanceAnalytics = hasFeatureConfig
    ? features.performanceAnalytics === true
    : plan === "starter" || plan === "pro";

  const canViewAdvancedFeedback = hasFeatureConfig
    ? features.advancedFeedback === true
    : plan === "pro";

  const canViewSkillTrends = hasFeatureConfig
    ? features.skillTrends === true
    : plan === "pro";

  const advancedFeedback = sourceReport?.advancedFeedback || null;

  // =========================================================
  // DOWNLOAD PDF
  // =========================================================

  const handleDownloadPdf = async () => {
    try {
      if (!canDownloadPdf) {
        return;
      }

      const pdfInterviewId =
        interviewId || sourceReport?._id || sourceReport?.interviewId;

      if (!pdfInterviewId) {
        alert("Interview ID not found.");
        return;
      }

      setDownloadingPdf(true);

      const response = await axiosInstance.get(
        `/api/interview/history/${pdfInterviewId}/pdf`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `interview-report-${pdfInterviewId}.pdf`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Failed to download the interview report.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (!sourceReport && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-100 px-4">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md"
        >
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />

          <h2 className="text-xl font-semibold text-gray-800 mt-5">
            Loading Interview Report
          </h2>

          <p className="text-gray-500 mt-2 text-sm">
            Please wait while we load your interview analytics.
          </p>
        </motion.div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (!sourceReport && reportError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-indigo-100 px-4">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md"
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <FaTimesCircle className="text-2xl text-red-500" />
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mt-5">
            Unable to Load Report
          </h2>

          <p className="text-gray-500 mt-2">{reportError}</p>

          <motion.button
            type="button"
            onClick={() => navigate("/history")}
            whileHover={{
              scale: 1.03,
            }}
            whileTap={{
              scale: 0.95,
            }}
            className="mt-6 px-5 py-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-500 text-white font-semibold shadow-md"
          >
            Back to History
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // =========================================================
  // NO REPORT
  // =========================================================

  if (!sourceReport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Report data not available
          </h2>

          <p className="text-gray-500 mt-2">
            We could not load your interview report.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // BASIC INTERVIEW DATA
  // =========================================================

  const role = sourceReport.role || "Interview";

  const experience = sourceReport.experience || "";

  const mode = sourceReport.mode || "";

  // =========================================================
  // BASIC QUESTION STATISTICS
  // =========================================================

  // These values are available to every plan from the backend.

  const totalQuestions = Number(sourceReport.totalQuestions) || 0;

  const answeredCount = Number(sourceReport.answeredCount) || 0;

  const skippedCount = Number(sourceReport.skippedCount) || 0;

  const primaryQuestionCount = Number(sourceReport.primaryQuestionCount) || 0;

  const followUpQuestionCount = Number(sourceReport.followUpQuestionCount) || 0;

  // =========================================================
  // SCORE CALCULATIONS
  // =========================================================

  const calculateAverage = (values) => {
    if (!values.length) {
      return 0;
    }

    return (
      values.reduce((total, value) => total + Number(value || 0), 0) /
      values.length
    );
  };

  // =========================================================
  // BASIC REPORT SCORES
  // =========================================================

  // These values come directly from finishInterview()
  // and are available to Free, Starter and Pro users.

  const finalScore =
    sourceReport.finalScore !== undefined && sourceReport.finalScore !== null
      ? Number(sourceReport.finalScore)
      : 0;

  const confidence =
    sourceReport.confidence !== undefined && sourceReport.confidence !== null
      ? Number(sourceReport.confidence)
      : 0;

  const communication =
    sourceReport.communication !== undefined &&
    sourceReport.communication !== null
      ? Number(sourceReport.communication)
      : 0;

  const correctness =
    sourceReport.correctness !== undefined && sourceReport.correctness !== null
      ? Number(sourceReport.correctness)
      : 0;

  // =========================================================
  // PREMIUM QUESTION DATA
  // =========================================================

  // Only Starter/Pro users with performanceAnalytics
  // receive questionWiseScore from the backend.

  const questionWiseScore =
    canViewPerformanceAnalytics && Array.isArray(sourceReport.questionWiseScore)
      ? sourceReport.questionWiseScore
      : [];

  // =========================================================
  // FOLLOW-UP AVERAGE
  // =========================================================

  const followUpQuestions = canViewDetailedFeedback
    ? questionWiseScore.filter((question) => question.type === "followup")
    : [];

  const followUpAverage = canViewDetailedFeedback
    ? Number(
        (
          sourceReport.followUpAverage ??
          calculateAverage(followUpQuestions.map((question) => question.score))
        ).toFixed(1),
      )
    : 0;

  // =========================================================
  // DIFFICULTY PERFORMANCE
  // =========================================================

  const calculateDifficultyAverage = (difficulty) => {
    const questions = questionWiseScore.filter(
      (question) => question.difficulty?.toLowerCase() === difficulty,
    );

    return calculateAverage(questions.map((question) => question.score));
  };

  const difficultyPerformance = canViewPerformanceAnalytics
    ? {
        easy:
          sourceReport.difficultyPerformance?.easy ??
          calculateDifficultyAverage("easy"),

        medium:
          sourceReport.difficultyPerformance?.medium ??
          calculateDifficultyAverage("medium"),

        hard:
          sourceReport.difficultyPerformance?.hard ??
          calculateDifficultyAverage("hard"),
      }
    : {
        easy: 0,
        medium: 0,
        hard: 0,
      };

  // =========================================================
  // PERFORMANCE TREND
  // =========================================================

  const performanceTrend =
    canViewPerformanceAnalytics &&
    Array.isArray(sourceReport.performanceTrend) &&
    sourceReport.performanceTrend.length > 0
      ? sourceReport.performanceTrend
      : canViewPerformanceAnalytics
        ? questionWiseScore.map((question, index) => ({
            questionNumber: question.questionNumber || index + 1,

            score: Number(question.score) || 0,
          }))
        : [];

  // =========================================================
  // HELPERS
  // =========================================================

  const formatScore = (score) => {
    return Number(score || 0).toFixed(1);
  };

  const getScoreColor = (score) => {
    if (score >= 8) {
      return "text-green-600";
    }

    if (score >= 6) {
      return "text-blue-600";
    }

    if (score >= 4) {
      return "text-yellow-600";
    }

    return "text-red-600";
  };

  const getScoreBackground = (score) => {
    if (score >= 8) {
      return "bg-green-100";
    }

    if (score >= 6) {
      return "bg-blue-100";
    }

    if (score >= 4) {
      return "bg-yellow-100";
    }

    return "bg-red-100";
  };

  const getScoreLabel = (score) => {
    if (score >= 8) {
      return "Excellent";
    }

    if (score >= 6) {
      return "Good";
    }

    if (score >= 4) {
      return "Needs Improvement";
    }

    return "Needs Significant Improvement";
  };

  // =========================================================
  // SCORE CARD
  // =========================================================

  const ScoreCard = ({ title, score, icon, description }) => {
    return (
      <motion.div
        whileHover={{
          y: -4,
        }}
        transition={{
          duration: 0.2,
        }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>

            <div className="flex items-baseline gap-1 mt-2">
              <span
                className={`text-3xl sm:text-4xl font-bold ${getScoreColor(
                  score,
                )}`}
              >
                {formatScore(score)}
              </span>

              <span className="text-sm text-gray-400">/10</span>
            </div>
          </div>

          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${getScoreBackground(
              score,
            )} ${getScoreColor(score)}`}
          >
            {icon}
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 mt-4">{description}</p>
      </motion.div>
    );
  };

  // =========================================================
  // PERFORMANCE BAR
  // =========================================================

  const PerformanceBar = ({ label, score }) => {
    const percentage = Math.min(Math.max(Number(score || 0) * 10, 0), 100);

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>

          <span className={`text-sm font-bold ${getScoreColor(score)}`}>
            {formatScore(score)}/10
          </span>
        </div>

        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{
              width: 0,
            }}
            animate={{
              width: `${percentage}%`,
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
            }}
            className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full"
          />
        </div>
      </div>
    );
  };

  // =========================================================
  // TREND HELPERS
  // =========================================================

  const getTrendIcon = (currentScore, previousScore) => {
    if (currentScore > previousScore) {
      return <FaArrowUp className="text-green-500" />;
    }

    if (currentScore < previousScore) {
      return <FaArrowDown className="text-red-500" />;
    }

    return <FaMinus className="text-gray-400" />;
  };

  // =========================================================
  // REPORT
  // =========================================================

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-6 sm:mb-8"
        >
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* LEFT HEADER */}

              <div>
                <div className="relative group mb-4 w-fit">
                  <motion.button
                    type="button"
                    onClick={() => navigate("/")}
                    whileHover={{
                      x: -2,
                    }}
                    whileTap={{
                      scale: 0.95,
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:text-blue-600 hover:border-blue-300 transition shadow-sm"
                    aria-label="Back to Home"
                  >
                    <BsArrowLeft size={20} />
                  </motion.button>

                  <div
                    className="
                      absolute left-1/2 top-full z-50
                      mt-2 -translate-x-1/2
                      whitespace-nowrap
                      rounded-lg bg-gray-800 px-3 py-2
                      text-xs font-medium text-white
                      opacity-0 invisible
                      group-hover:opacity-100
                      group-hover:visible
                      transition-all duration-200
                      pointer-events-none
                    "
                  >
                    Back to Home
                  </div>
                </div>

                <p className="text-sm font-medium text-blue-600 mb-2">
                  AI INTERVIEW REPORT
                </p>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">
                  Interview Analytics
                </h1>

                <div className="flex flex-wrap gap-2 mt-3">
                  {role && (
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      {role}
                    </span>
                  )}

                  {experience && (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      {experience}
                    </span>
                  )}

                  {mode && (
                    <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                      {mode}
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT HEADER ACTIONS */}
              <div className="flex flex-col items-stretch gap-3 self-start lg:self-center">
                {/* STATUS */}
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  <FaCheckCircle className="text-green-500 text-xl" />

                  <div>
                    <p className="text-xs text-green-600">Interview Status</p>

                    <p className="font-semibold text-green-700">Completed</p>
                  </div>
                </div>

                {/* DOWNLOAD PDF */}
                <div className="relative group">
                  <motion.button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={!canDownloadPdf || downloadingPdf}
                    whileHover={
                      canDownloadPdf && !downloadingPdf
                        ? { scale: 1.02 }
                        : undefined
                    }
                    whileTap={
                      canDownloadPdf && !downloadingPdf
                        ? { scale: 0.98 }
                        : undefined
                    }
                    aria-disabled={!canDownloadPdf || downloadingPdf}
                    className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition ${
                      canDownloadPdf
                        ? "bg-gray-900 text-white shadow-md hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                        : "cursor-not-allowed bg-gray-200 text-gray-500"
                    }`}
                  >
                    {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
                  </motion.button>

                  {/* FREE PLAN TOOLTIP */}
                  {!canDownloadPdf && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-xl bg-gray-900 px-4 py-3 text-center text-xs leading-5 text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <div className="font-semibold">
                        🔒 PDF download is locked
                      </div>

                      <div className="mt-1 text-gray-300">
                        Available on Starter and Pro plans.
                      </div>

                      <div className="mt-2 font-semibold text-indigo-300">
                        Upgrade your plan →
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ================================================= */}
        {/* OVERALL SCORE + SCORE CARDS */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-6">
          {/* OVERALL SCORE */}

          <motion.div
            whileHover={{
              y: -4,
            }}
            className="bg-linear-to-br from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg p-5 sm:p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Overall Score
                </p>

                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl sm:text-5xl font-bold">
                    {formatScore(finalScore)}
                  </span>

                  <span className="text-blue-200">/10</span>
                </div>
              </div>

              <FaChartLine className="text-2xl text-blue-100" />
            </div>

            <div className="mt-4">
              <span className="inline-flex px-3 py-1 rounded-full bg-white/20 text-xs font-medium">
                {getScoreLabel(finalScore)}
              </span>
            </div>
          </motion.div>

          <ScoreCard
            title="Confidence"
            score={confidence}
            icon={<FaBullseye />}
            description="How confidently your answers were presented."
          />

          <ScoreCard
            title="Communication"
            score={communication}
            icon={<FaComments />}
            description="Clarity, structure, and effectiveness of communication."
          />

          <ScoreCard
            title="Correctness"
            score={correctness}
            icon={<FaBrain />}
            description="Technical accuracy, relevance, and completeness."
          />
        </div>

        {/* ================================================= */}
        {/* PERFORMANCE + INTERVIEW STATISTICS */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* PERFORMANCE BREAKDOWN */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6"
          >
            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Performance Breakdown
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Your performance across the main evaluation areas.
              </p>
            </div>

            <div className="space-y-6">
              <PerformanceBar label="Confidence" score={confidence} />

              <PerformanceBar label="Communication" score={communication} />

              <PerformanceBar label="Correctness" score={correctness} />

              <PerformanceBar label="Overall Performance" score={finalScore} />
            </div>
          </motion.div>

          {/* INTERVIEW STATISTICS */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
            }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6"
          >
            <div className="mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                Interview Statistics
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Overview of your interview.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FaQuestionCircle className="text-blue-500" />

                  <span className="text-sm text-gray-600">Total Questions</span>
                </div>

                <span className="font-bold text-gray-800">
                  {totalQuestions}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-green-500" />

                  <span className="text-sm text-gray-600">Answered</span>
                </div>

                <span className="font-bold text-green-700">
                  {answeredCount}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FaTimesCircle className="text-red-500" />

                  <span className="text-sm text-gray-600">Skipped</span>
                </div>

                <span className="font-bold text-red-600">{skippedCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <FaBrain className="text-indigo-500" />

                  <span className="text-sm text-gray-600">Follow-ups</span>
                </div>

                <span className="font-bold text-indigo-700">
                  {followUpQuestionCount}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ================================================= */}
        {/* QUESTION TYPE + DIFFICULTY */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* QUESTION TYPE */}

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6"
          >
            <h2 className="text-lg font-bold text-gray-800">
              Question Distribution
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-5">
              Breakdown of primary and follow-up questions.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {primaryQuestionCount}
                </p>

                <p className="text-sm text-gray-600 mt-1">Primary</p>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-5 text-center">
                <p className="text-3xl font-bold text-indigo-600">
                  {followUpQuestionCount}
                </p>

                <p className="text-sm text-gray-600 mt-1">Follow-up</p>
              </div>
            </div>

            {followUpQuestionCount > 0 && (
              <div className="mt-4">
                {canViewDetailedFeedback ? (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Follow-up Average
                      </span>

                      <span className="font-bold text-gray-800">
                        {formatScore(followUpAverage)}
                        /10
                      </span>
                    </div>
                  </div>
                ) : (
                  <LockedFeature
                    title="Follow-up Performance"
                    description="Get detailed insights into how you handled follow-up questions."
                    requiredPlan="Starter"
                  />
                )}
              </div>
            )}
          </motion.div>

          {/* DIFFICULTY */}

          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
            }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6"
          >
            {canViewPerformanceAnalytics ? (
              <>
                <h2 className="text-lg font-bold text-gray-800">
                  Difficulty Performance
                </h2>

                <p className="text-sm text-gray-500 mt-1 mb-5">
                  Average score by question difficulty.
                </p>

                <div className="space-y-5">
                  <PerformanceBar
                    label="Easy"
                    score={difficultyPerformance.easy || 0}
                  />

                  <PerformanceBar
                    label="Medium"
                    score={difficultyPerformance.medium || 0}
                  />

                  <PerformanceBar
                    label="Hard"
                    score={difficultyPerformance.hard || 0}
                  />
                </div>
              </>
            ) : (
              <LockedFeature
                title="Difficulty Performance"
                description="See how you perform across Easy, Medium, and Hard interview questions."
                requiredPlan="Starter"
              />
            )}
          </motion.div>
        </div>

        {/* ================================================= */}
        {/* PERFORMANCE TREND */}
        {/* ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6"
        >
          {canViewPerformanceAnalytics ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  Performance Trend
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Score progression throughout the interview.
                </p>
              </div>

              {performanceTrend.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No performance data available.
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div
                    className="flex items-end gap-3 sm:gap-4 min-w-max px-2"
                    style={{
                      height: "220px",
                    }}
                  >
                    {performanceTrend.map((item, index) => {
                      const score = Number(item.score) || 0;

                      const height = Math.max(score * 10, 4);

                      const previousScore =
                        index > 0
                          ? Number(performanceTrend[index - 1]?.score) || 0
                          : score;

                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center justify-end h-full"
                        >
                          <div className="flex items-center gap-1 mb-2 text-xs">
                            {index > 0 && getTrendIcon(score, previousScore)}

                            <span
                              className={`font-semibold ${getScoreColor(
                                score,
                              )}`}
                            >
                              {formatScore(score)}
                            </span>
                          </div>

                          <motion.div
                            initial={{
                              height: 0,
                            }}
                            animate={{
                              height: `${height}%`,
                            }}
                            transition={{
                              duration: 0.6,
                              delay: index * 0.05,
                            }}
                            className="w-8 sm:w-10 bg-linear-to-t from-blue-600 to-indigo-400 rounded-t-lg"
                          />

                          <div className="mt-2 text-xs text-gray-500">
                            Q{item.questionNumber || index + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <LockedFeature
              title="Performance Trend"
              description="Track how your performance changes from question to question throughout the interview."
              requiredPlan="Starter"
            />
          )}
        </motion.div>

        {/* ================================================= */}
        {/* QUESTION-WISE ANALYSIS */}
        {/* ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-8"
        >
          {canViewPerformanceAnalytics ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  Question Analysis
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Review your answer, score, and feedback for every question.
                </p>
              </div>

              {questionWiseScore.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  No question-wise analysis available.
                </div>
              ) : (
                <div className="space-y-4">
                  {questionWiseScore.map((item, index) => {
                    const score = Number(item.score) || 0;

                    const skipped = !item.answer || !item.answer.trim();

                    return (
                      <motion.div
                        key={index}
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: index * 0.04,
                        }}
                        className="border border-gray-200 rounded-2xl overflow-hidden"
                      >
                        {/* QUESTION HEADER */}

                        <div className="bg-gray-50 px-4 sm:px-5 py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                Q{item.questionNumber || index + 1}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                  {item.type === "followup"
                                    ? "Follow-up"
                                    : "Primary"}
                                </span>

                                {item.difficulty && (
                                  <span className="px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-medium capitalize">
                                    {item.difficulty}
                                  </span>
                                )}

                                {skipped && (
                                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-xs font-medium">
                                    Skipped
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                Score
                              </span>

                              <span
                                className={`text-lg font-bold ${getScoreColor(
                                  score,
                                )}`}
                              >
                                {formatScore(score)}
                                /10
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* QUESTION CONTENT */}

                        <div className="p-4 sm:p-5">
                          <p className="font-semibold text-gray-800 leading-relaxed">
                            {item.question}
                          </p>

                          {/* ANSWER */}

                          <div className="mt-5">
                            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400 mb-2">
                              Candidate Answer
                            </p>

                            <div
                              className={`rounded-xl p-4 text-sm leading-relaxed ${
                                skipped
                                  ? "bg-red-50 text-red-600 border border-red-100"
                                  : "bg-gray-50 text-gray-700"
                              }`}
                            >
                              {skipped
                                ? "No answer was provided for this question."
                                : item.answer}
                            </div>
                          </div>

                          {/* SCORE BREAKDOWN */}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                            <div className="bg-blue-50 rounded-xl p-3">
                              <p className="text-xs text-gray-500">
                                Confidence
                              </p>

                              <p className="font-bold text-blue-600 mt-1">
                                {formatScore(item.confidence)}
                                /10
                              </p>
                            </div>

                            <div className="bg-indigo-50 rounded-xl p-3">
                              <p className="text-xs text-gray-500">
                                Communication
                              </p>

                              <p className="font-bold text-indigo-600 mt-1">
                                {formatScore(item.communication)}
                                /10
                              </p>
                            </div>

                            <div className="bg-green-50 rounded-xl p-3">
                              <p className="text-xs text-gray-500">
                                Correctness
                              </p>

                              <p className="font-bold text-green-600 mt-1">
                                {formatScore(item.correctness)}
                                /10
                              </p>
                            </div>
                          </div>

                          {/* FEEDBACK */}

                          <div className="mt-5">
                            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400 mb-2">
                              AI Feedback
                            </p>

                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700 leading-relaxed">
                              {item.feedback || "No feedback available."}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <LockedFeature
              title="Question Analysis"
              description="Review your answer, score, and detailed AI feedback for every interview question."
              requiredPlan="Starter"
            />
          )}
        </motion.div>

        {/* ================================================= */}
        {/* PRO - ADVANCED AI FEEDBACK */}
        {/* ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-8"
        >
          {canViewAdvancedFeedback ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  Advanced AI Feedback
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Get a deeper AI-powered assessment of your overall interview
                  performance.
                </p>
              </div>

              {!sourceReport.advancedFeedback ? (
                <div className="text-center py-8 text-gray-400">
                  Advanced AI feedback is not available for this interview.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* OVERALL ASSESSMENT */}

                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-800 mb-2">
                      Overall Assessment
                    </h3>

                    <p className="text-sm text-gray-700 leading-relaxed">
                      {sourceReport.advancedFeedback.overallAssessment ||
                        "No overall assessment available."}
                    </p>
                  </div>

                  {/* STRENGTHS */}

                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">Strengths</h3>

                    {Array.isArray(sourceReport.advancedFeedback.strengths) &&
                    sourceReport.advancedFeedback.strengths.length > 0 ? (
                      <div className="space-y-3">
                        {sourceReport.advancedFeedback.strengths.map(
                          (strength, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl p-4"
                            >
                              <FaCheckCircle className="text-green-600 mt-0.5 shrink-0" />

                              <p className="text-sm text-gray-700 leading-relaxed">
                                {strength}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No strengths available.
                      </p>
                    )}
                  </div>

                  {/* WEAKNESSES */}

                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">
                      Areas for Improvement
                    </h3>

                    {Array.isArray(sourceReport.advancedFeedback.weaknesses) &&
                    sourceReport.advancedFeedback.weaknesses.length > 0 ? (
                      <div className="space-y-3">
                        {sourceReport.advancedFeedback.weaknesses.map(
                          (weakness, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4"
                            >
                              <FaTimesCircle className="text-red-500 mt-0.5 shrink-0" />

                              <p className="text-sm text-gray-700 leading-relaxed">
                                {weakness}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No improvement areas available.
                      </p>
                    )}
                  </div>

                  {/* RECOMMENDATIONS */}

                  <div>
                    <h3 className="font-bold text-gray-800 mb-3">
                      Recommendations
                    </h3>

                    {Array.isArray(
                      sourceReport.advancedFeedback.recommendations,
                    ) &&
                    sourceReport.advancedFeedback.recommendations.length > 0 ? (
                      <div className="space-y-3">
                        {sourceReport.advancedFeedback.recommendations.map(
                          (recommendation, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4"
                            >
                              <FaBrain className="text-blue-600 mt-0.5 shrink-0" />

                              <p className="text-sm text-gray-700 leading-relaxed">
                                {recommendation}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No recommendations available.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <LockedFeature
              title="Advanced AI Feedback"
              description="Get a deeper AI-powered analysis of your strengths, weaknesses, and interview improvement areas."
              requiredPlan="Pro"
            />
          )}
        </motion.div>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <div className="flex flex-col items-center gap-4 pb-8">
          <p className="text-sm text-gray-400 text-center">
            Keep practicing and use this feedback to improve your next
            interview.
          </p>

          <motion.button
            type="button"
            onClick={() => navigate("/")}
            whileHover={{
              scale: 1.03,
            }}
            whileTap={{
              scale: 0.95,
            }}
            className="px-6 py-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-500 text-white font-semibold shadow-lg hover:opacity-90 transition"
          >
            Back to Home
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Step3Report;
