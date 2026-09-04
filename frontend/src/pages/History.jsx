import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaQuestionCircle,
  FaSearch,
  FaTimesCircle,
} from "react-icons/fa";
import axiosInstance from "../services/axiosInstance.js";

const History = () => {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  // =========================================================
  // FETCH INTERVIEW HISTORY
  // =========================================================

  const fetchHistory = async () => {
    try {
      setLoading(true);

      const { data } = await axiosInstance.get("/api/interview/history");

      setInterviews(data.interviews || []);
    } catch (error) {
      console.error("History error:", error.response?.data || error.message);

      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD HISTORY
  // =========================================================

  useEffect(() => {
    fetchHistory();
  }, []);

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) return "Unknown date";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // =========================================================
  // SCORE HELPERS
  // =========================================================

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
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    if (score >= 4) return "Needs Improvement";

    return "Needs Improvement";
  };

  // =========================================================
  // FILTER + SEARCH
  // =========================================================

  const filteredInterviews = interviews.filter((interview) => {
    const searchValue = search.toLowerCase().trim();

    const matchesSearch =
      !searchValue ||
      interview.role?.toLowerCase().includes(searchValue) ||
      interview.mode?.toLowerCase().includes(searchValue) ||
      interview.experience?.toLowerCase().includes(searchValue);

    const matchesFilter = filter === "All" || interview.mode === filter;

    return matchesSearch && matchesFilter;
  });

  // =========================================================
  // VIEW REPORT
  // =========================================================

  const handleViewReport = (interviewId) => {
    navigate(`/history/${interviewId}`);
  };

  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />

          <p className="text-gray-500 mt-4 text-sm">
            Loading your interview history...
          </p>
        </motion.div>
      </div>
    );
  }

  // =========================================================
  // UI
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
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* TITLE */}

              <div>
                {/* BACK BUTTON */}

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
                    <FaArrowLeft size={16} />
                  </motion.button>

                  {/* TOOLTIP */}

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
                  INTERVIEW HISTORY
                </p>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800">
                  Previous Interviews
                </h1>

                <p className="text-gray-500 mt-2 text-sm sm:text-base">
                  Review your previous AI interview performances and reports.
                </p>
              </div>

              {/* TOTAL INTERVIEWS */}

              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 self-start lg:self-center">
                <p className="text-xs text-blue-500 font-medium">
                  Total Interviews
                </p>

                <div className="flex items-center gap-2 mt-1">
                  <FaChartLine className="text-blue-600" />

                  <span className="text-2xl font-bold text-blue-700">
                    {interviews.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ================================================= */}
        {/* SEARCH + FILTER */}
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
          transition={{
            delay: 0.1,
          }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* SEARCH */}

            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by role, mode or experience..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              />
            </div>

            {/* FILTER */}

            <div className="flex gap-2">
              {["All", "Technical", "HR"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition ${
                    filter === item
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ================================================= */}
        {/* EMPTY STATE */}
        {/* ================================================= */}

        {filteredInterviews.length === 0 ? (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 sm:p-16 text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center">
              <FaQuestionCircle className="text-2xl text-blue-500" />
            </div>

            <h2 className="text-xl font-bold text-gray-800 mt-5">
              No interviews found
            </h2>

            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
              {interviews.length === 0
                ? "You haven't completed any interviews yet. Start your first AI interview to see it here."
                : "No interviews match your current search or filter."}
            </p>

            {interviews.length === 0 && (
              <motion.button
                type="button"
                onClick={() => navigate("/interview")}
                whileHover={{
                  scale: 1.03,
                }}
                whileTap={{
                  scale: 0.95,
                }}
                className="mt-6 px-6 py-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-500 text-white font-semibold shadow-lg hover:opacity-90 transition"
              >
                Start Interview
              </motion.button>
            )}
          </motion.div>
        ) : (
          /* ================================================= */
          /* INTERVIEW LIST */
          /* ================================================= */

          <div className="space-y-4">
            {filteredInterviews.map((interview, index) => {
              const score = Number(interview.finalScore) || 0;

              return (
                <motion.div
                  key={interview.interviewId}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.06,
                  }}
                  whileHover={{
                    y: -3,
                  }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                      {/* LEFT */}

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                            {interview.role || "Interview"}
                          </h2>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              interview.mode === "HR"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {interview.mode || "Technical"}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              interview.status === "Completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {interview.status || "Incomplete"}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500">
                          {interview.experience || "Experience not specified"}
                        </p>

                        {/* STATS */}

                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <FaQuestionCircle className="text-blue-500" />

                            <span>{interview.totalQuestions} Questions</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <FaCheckCircle className="text-green-500" />

                            <span>{interview.answeredQuestions} Answered</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <FaTimesCircle className="text-red-500" />

                            <span>{interview.skippedQuestions} Skipped</span>
                          </div>

                          {interview.followUpQuestions > 0 && (
                            <div className="flex items-center gap-1.5">
                              <FaChartLine className="text-indigo-500" />

                              <span>
                                {interview.followUpQuestions} Follow-up
                              </span>
                            </div>
                          )}
                        </div>

                        {/* DATE */}

                        <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                          <FaClock />

                          <span>{formatDate(interview.createdAt)}</span>

                          <span>•</span>

                          <span>{formatTime(interview.createdAt)}</span>
                        </div>
                      </div>

                      {/* RIGHT SCORE */}

                      <div className="flex items-center justify-between lg:justify-end gap-5">
                        <div
                          className={`rounded-2xl px-5 py-4 text-center min-w-28 ${getScoreBackground(
                            score,
                          )}`}
                        >
                          <p className="text-xs text-gray-500">Score</p>

                          <p
                            className={`text-2xl sm:text-3xl font-bold ${getScoreColor(
                              score,
                            )}`}
                          >
                            {score.toFixed(1)}
                          </p>

                          <p
                            className={`text-xs font-medium ${getScoreColor(
                              score,
                            )}`}
                          >
                            {getScoreLabel(score)}
                          </p>
                        </div>

                        {/* VIEW REPORT */}

                        <motion.button
                          type="button"
                          onClick={() =>
                            handleViewReport(interview.interviewId)
                          }
                          whileHover={{
                            x: 3,
                          }}
                          whileTap={{
                            scale: 0.95,
                          }}
                          className="flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-indigo-500 text-white px-4 sm:px-5 py-3 rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition"
                        >
                          <span className="hidden sm:inline">View Report</span>

                          <FaArrowRight />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        {filteredInterviews.length > 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-500">
                {filteredInterviews.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-500">
                {interviews.length}
              </span>{" "}
              interviews
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
