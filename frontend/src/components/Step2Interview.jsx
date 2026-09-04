import maleVideo from "../assets/Videos/male-ai.mp4";
import femaleVideo from "../assets/Videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import axiosInstance from "../services/axiosInstance.js";
import { BsArrowRight } from "react-icons/bs";
import { loadWhisper, transcribeAudio } from "../services/whisper.service.js";

const Step2Interview = ({ interviewData, onFinish }) => {
  const { interviewId, userName } = interviewData.data;

  // =========================================================
  // QUESTIONS
  // =========================================================

  const [questions, setQuestions] = useState(
    interviewData.data.questions || [],
  );

  // FIX:
  // Always keep the latest questions available to async callbacks.
  const questionsRef = useRef(interviewData.data.questions || []);

  // FIX:
  // Keep the latest current index available to async callbacks.
  const currentIndexRef = useRef(0);

  // =========================================================
  // INTERVIEW STATE
  // =========================================================

  const [isIntroPhase, setIsIntroPhase] = useState(true);

  const [isAutoMoving, setIsAutoMoving] = useState(false);

  // FIX:
  // React state can be stale inside setTimeout callbacks.
  // This ref always contains the latest value.
  const isAutoMovingRef = useRef(false);

  const [isMicOn, setIsMicOn] = useState(false);

  // =========================================================
  // MICROPHONE / RECORDING REFS
  // =========================================================

  const mediaStreamRef = useRef(null);

  // Current speech segment recorder
  const segmentRecorderRef = useRef(null);

  // Audio chunks for ONLY the current speech segment
  const segmentChunksRef = useRef([]);

  // Audio analyser for silence detection
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const vadIntervalRef = useRef(null);

  // Silence detection
  const lastSoundTimeRef = useRef(Date.now());
  const speechDetectedRef = useRef(false);
  const silenceTriggeredRef = useRef(false);

  // Prevent multiple Whisper requests at the same time
  const transcribingLiveRef = useRef(false);

  // =========================================================
  // UI STATE
  // =========================================================

  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answer, setAnswer] = useState("");

  const [feedback, setFeedback] = useState("");

  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 60);

  const [selectedVoice, setSelectedVoice] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [voiceGender, setVoiceGender] = useState("female");

  const [subtitle, setSubTitle] = useState("");

  const videoRef = useRef(null);

  const currentQuestion = questions[currentIndex];

  // =========================================================
  // TRANSITION REFS
  // =========================================================

  const isTransitioningRef = useRef(false);

  const autoNextTimerRef = useRef(null);

  // =========================================================
  // LOAD SPEECH SYNTHESIS VOICES
  // =========================================================

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      if (!voices.length) return;

      const femaleVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("female"),
      );

      if (femaleVoice) {
        setSelectedVoice(femaleVoice);
        setVoiceGender("female");
        return;
      }

      const maleVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("male"),
      );

      if (maleVoice) {
        setSelectedVoice(maleVoice);
        setVoiceGender("male");
        return;
      }

      setSelectedVoice(voices[0]);
      setVoiceGender("female");
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;

  // =========================================================
  // AI SPEECH
  // =========================================================

  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !selectedVoice) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const humanText = text.replace(/,/g, ", ...").replace(/\./g, ". ...");

      const utterance = new SpeechSynthesisUtterance(humanText);

      utterance.voice = selectedVoice;

      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsAIPlaying(true);

        // Stop candidate microphone while AI speaks
        stopMic();

        videoRef.current?.play().catch(() => {});
      };

      utterance.onend = () => {
        videoRef.current?.pause();

        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }

        setIsAIPlaying(false);

        setTimeout(() => {
          setSubTitle("");
          resolve();
        }, 300);
      };

      utterance.onerror = () => {
        setIsAIPlaying(false);
        setSubTitle("");
        resolve();
      };

      setSubTitle(text);

      window.speechSynthesis.speak(utterance);
    });
  };

  // =========================================================
  // INTRO / QUESTION SPEECH
  // =========================================================

  useEffect(() => {
    if (!selectedVoice) return;

    const runIntro = async () => {
      if (isIntroPhase) {
        await speakText(
          `Hello ${userName}, It's great to meet you! I hope you're feeling confident and ready.`,
        );

        await speakText(
          `I'll ask you a series of questions, and I want you to answer them as best as you can. Let's get started! Remember, take your time and think about your responses. Good luck!`,
        );

        setIsIntroPhase(false);
      } else if (currentQuestion) {
        await new Promise((resolve) => setTimeout(resolve, 800));

        // FIX:
        // Use latest questions instead of potentially stale state.
        const latestQuestions = questionsRef.current;

        if (currentIndexRef.current === latestQuestions.length - 1) {
          await speakText("Alright, this one might be a bit challenging.");
        }

        await speakText(currentQuestion.question);

        // Start microphone after AI finishes
        await startMic();
      }
    };

    runIntro();
  }, [selectedVoice, isIntroPhase, currentIndex]);

  // =========================================================
  // TIMER
  // =========================================================

  useEffect(() => {
    if (isIntroPhase) return;
    if (!currentQuestion) return;
    if (isSubmitting) return;
    if (feedback) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isIntroPhase, currentIndex, isSubmitting, feedback]);

  // =========================================================
  // START A NEW SPEECH SEGMENT
  // =========================================================

  const startNewSpeechSegment = () => {
    const stream = mediaStreamRef.current;

    if (!stream) {
      console.log("No microphone stream available.");
      return;
    }

    if (
      segmentRecorderRef.current &&
      segmentRecorderRef.current.state === "recording"
    ) {
      return;
    }

    try {
      let recorder;

      // Prefer webm/opus
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
      } else {
        recorder = new MediaRecorder(stream);
      }

      segmentChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          segmentChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("Speech segment recorder error:", event);
      };

      recorder.onstart = () => {
        console.log("🎤 New speech segment recorder started");
      };

      segmentRecorderRef.current = recorder;

      recorder.start();
    } catch (error) {
      console.error("Failed to start speech segment:", error);
    }
  };

  // =========================================================
  // TRANSCRIBE CURRENT SPEECH SEGMENT
  // =========================================================

  const transcribeCurrentRecording = async () => {
    if (transcribingLiveRef.current) {
      return;
    }

    const recorder = segmentRecorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      return;
    }

    transcribingLiveRef.current = true;

    try {
      console.log("========== 1 SECOND SILENCE DETECTED ==========");

      const audioBlob = await new Promise((resolve) => {
        const chunks = segmentChunksRef.current;

        recorder.onstop = () => {
          const blob = new Blob(chunks, {
            type: recorder.mimeType || "audio/webm",
          });

          resolve(blob);
        };

        recorder.stop();
      });

      segmentRecorderRef.current = null;

      segmentChunksRef.current = [];

      console.log("Complete speech segment:", audioBlob?.size || 0, "bytes");

      // Start recording the next segment immediately.
      startNewSpeechSegment();

      if (!audioBlob || audioBlob.size === 0) {
        console.log("Empty speech segment.");
        return;
      }

      console.log("Sending COMPLETE SEGMENT to Whisper...");

      const transcript = await transcribeAudio(audioBlob);

      console.log("========== LIVE TRANSCRIPT ==========");

      console.log(transcript);

      if (transcript) {
        setAnswer((previousAnswer) => {
          const previous = previousAnswer.trim();

          const current = transcript.trim();

          if (!previous) {
            return current;
          }

          return `${previous} ${current}`;
        });
      }
    } catch (error) {
      console.error("Live transcription error:", error);

      if (
        !segmentRecorderRef.current ||
        segmentRecorderRef.current.state !== "recording"
      ) {
        startNewSpeechSegment();
      }
    } finally {
      transcribingLiveRef.current = false;
    }
  };

  // =========================================================
  // START MICROPHONE
  // =========================================================

  const startMic = async () => {
    if (isAIPlaying) return;

    // Already recording
    if (
      mediaStreamRef.current &&
      segmentRecorderRef.current &&
      segmentRecorderRef.current.state === "recording"
    ) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      mediaStreamRef.current = stream;

      console.log("🎤 Microphone started");

      // Start first speech segment
      startNewSpeechSegment();

      // =====================================================
      // AUDIO CONTEXT / SILENCE DETECTION
      // =====================================================

      const AudioContext = window.AudioContext || window.webkitAudioContext;

      const audioContext = new AudioContext();

      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.fftSize);

      lastSoundTimeRef.current = Date.now();

      speechDetectedRef.current = false;

      silenceTriggeredRef.current = false;

      const SILENCE_THRESHOLD = 0.03;

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) {
          return;
        }

        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;

          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / dataArray.length);

        const isSpeaking = rms > SILENCE_THRESHOLD;

        if (isSpeaking) {
          lastSoundTimeRef.current = Date.now();

          speechDetectedRef.current = true;

          silenceTriggeredRef.current = false;
        }

        const silenceDuration = Date.now() - lastSoundTimeRef.current;

        if (
          speechDetectedRef.current &&
          !silenceTriggeredRef.current &&
          silenceDuration >= 1000
        ) {
          silenceTriggeredRef.current = true;

          transcribeCurrentRecording();
        }
      }, 100);

      setIsMicOn(true);

      console.log("🎤 Recording started");
    } catch (error) {
      console.error("Microphone error:", error);

      setIsMicOn(false);
    }
  };

  // =========================================================
  // STOP MICROPHONE
  // =========================================================

  const stopMic = async () => {
    console.log("🎤 Stopping microphone...");

    // Stop VAD
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);

      vadIntervalRef.current = null;
    }

    // Stop current speech segment
    const recorder = segmentRecorderRef.current;

    const finalAudioPromise = new Promise((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        const chunks = segmentChunksRef.current;

        if (chunks.length > 0) {
          const blob = new Blob(chunks, {
            type: "audio/webm",
          });

          segmentChunksRef.current = [];

          resolve(blob);
        } else {
          resolve(null);
        }

        return;
      }

      const chunks = segmentChunksRef.current;

      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });

        segmentChunksRef.current = [];

        resolve(blob);
      };

      recorder.stop();
    });

    segmentRecorderRef.current = null;

    // Stop AudioContext
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (error) {
        console.error("AudioContext close error:", error);
      }

      audioContextRef.current = null;
    }

    analyserRef.current = null;

    // Stop microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());

      mediaStreamRef.current = null;
    }

    setIsMicOn(false);

    console.log("🎤 Recording stopped");

    return finalAudioPromise;
  };

  // =========================================================
  // MICROPHONE TOGGLE
  // =========================================================

  const toggleMic = async () => {
    if (isMicOn) {
      await stopMic();
    } else {
      await startMic();
    }
  };

  // =========================================================
  // SUBMIT ANSWER
  // =========================================================

  const submitAnswer = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Stop microphone and get final
      // unprocessed speech segment.
      const audioBlob = await stopMic();

      let finalAnswer = answer?.trim() || "";

      // Transcribe only final speech segment.
      if (audioBlob && audioBlob.size > 0) {
        console.log("Final speech segment:", audioBlob.size, "bytes");

        try {
          console.log("Transcribing final speech segment...");

          const transcript = await transcribeAudio(audioBlob);

          console.log("========== FINAL WHISPER TRANSCRIPT ==========");

          console.log(transcript);

          if (transcript) {
            finalAnswer = `${finalAnswer} ${transcript}`.trim();

            setAnswer(finalAnswer);
          }
        } catch (error) {
          console.error("Final transcription error:", error);
        }
      }

      // =====================================================
      // EMPTY ANSWER
      // =====================================================

      if (!finalAnswer) {
        console.log("No answer provided.");

        setFeedback("No answer was detected. Please try to provide an answer.");

        setIsSubmitting(false);

        return;
      }

      // =====================================================
      // SUBMIT TO BACKEND
      // =====================================================

      const result = await axiosInstance.post("/api/interview/submit-answer", {
        interviewId,
        questionIndex: currentIndex,
        answer: finalAnswer,
        timeTaken: currentQuestion.timeLimit - timeLeft,
      });

      // =====================================================
      // UPDATE QUESTIONS
      // =====================================================

      if (result.data.questions) {
        // FIX:
        // Update ref IMMEDIATELY.
        // Do not wait for React's next render.
        questionsRef.current = result.data.questions;

        setQuestions(result.data.questions);

        console.log(
          "Updated frontend questions:",
          result.data.questions.length,
        );

        console.log("Latest questions:", result.data.questions);
      }

      // =====================================================
      // FEEDBACK
      // =====================================================

      setFeedback(result.data.feedback);

      await speakText(result.data.feedback);

      // =====================================================
      // AUTOMATIC NEXT QUESTION
      // =====================================================

      // FIX:
      // Update ref immediately.
      isAutoMovingRef.current = true;

      setIsAutoMoving(true);

      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }

      autoNextTimerRef.current = setTimeout(() => {
        console.log("⏱️ Automatic next question triggered");

        console.log({
          currentIndex: currentIndexRef.current,
          totalQuestions: questionsRef.current.length,
          isAutoMoving: isAutoMovingRef.current,
        });

        handleNext(true);
      }, 5000);
    } catch (error) {
      console.error(
        "Error submitting answer:",
        error.response?.data || error.message,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================
  // NEXT QUESTION
  // =========================================================

  const handleNext = async (isAutomatic = false) => {
    // FIX:
    // Always use the latest values from refs.
    const latestQuestions = questionsRef.current;

    const latestCurrentIndex = currentIndexRef.current;

    console.log("========== HANDLE NEXT ==========");

    console.log({
      isAutomatic,
      currentIndex: latestCurrentIndex,
      totalQuestions: latestQuestions.length,
      isAutoMoving: isAutoMovingRef.current,
    });

    // =====================================================
    // PREVENT INVALID / DUPLICATE TRANSITIONS
    // =====================================================

    if (isTransitioningRef.current) {
      console.log("Transition already in progress. Ignoring.");

      return;
    }

    // =====================================================
    // AUTOMATIC TRANSITION VALIDATION
    // =====================================================

    // FIX:
    // Use ref instead of stale React state.
    if (isAutomatic && !isAutoMovingRef.current) {
      console.log("Automatic transition ignored.");

      return;
    }

    // =====================================================
    // CLEAR AUTOMATIC TIMER
    // =====================================================

    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);

      autoNextTimerRef.current = null;
    }

    // =====================================================
    // LOCK TRANSITION
    // =====================================================

    isTransitioningRef.current = true;

    try {
      const nextIndex = latestCurrentIndex + 1;

      console.log("Next question index:", nextIndex);

      // ===================================================
      // CHECK WHETHER INTERVIEW IS FINISHED
      // ===================================================

      if (nextIndex >= latestQuestions.length) {
        console.log("No more questions. Finishing interview.");

        // FIX:
        // Reset both ref and state.
        isAutoMovingRef.current = false;

        setIsAutoMoving(false);

        await finishInterview();

        return;
      }

      // ===================================================
      // STOP CURRENT MICROPHONE
      // ===================================================

      await stopMic();

      // ===================================================
      // RESET CURRENT QUESTION STATE
      // ===================================================

      setAnswer("");

      setFeedback("");

      // FIX:
      // Reset both ref and state.
      isAutoMovingRef.current = false;

      setIsAutoMoving(false);

      setIsMicOn(false);

      // ===================================================
      // MOVE TO NEXT QUESTION
      // ===================================================

      // FIX:
      // Update ref immediately before
      // updating React state.
      currentIndexRef.current = nextIndex;

      setCurrentIndex(nextIndex);

      const nextQuestion = latestQuestions[nextIndex];

      setTimeLeft(nextQuestion.timeLimit);

      console.log(
        "Moving to question:",
        nextIndex + 1,
        "of",
        latestQuestions.length,
      );

      console.log("Question type:", nextQuestion.type);

      console.log("Question:", nextQuestion.question);
    } catch (error) {
      console.error("Error moving to next question:", error);
    } finally {
      isTransitioningRef.current = false;
    }
  };

  // =========================================================
  // FINISH INTERVIEW
  // =========================================================

  const finishInterview = async () => {
    await stopMic();

    setIsMicOn(false);

    try {
      const result = await axiosInstance.post("/api/interview/finish", {
        interviewId,
      });

      console.log("Interview Finished:", result.data);

      onFinish(result.data);
    } catch (error) {
      console.error("Error finishing interview:", error);
    }
  };

  // =========================================================
  // AUTO SUBMIT WHEN TIMER EXPIRES
  // =========================================================

  useEffect(() => {
    if (isIntroPhase) return;

    if (!currentQuestion) return;

    if (timeLeft === 0 && !isSubmitting && !feedback) {
      submitAnswer();
    }
  }, [timeLeft]);

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);

        autoNextTimerRef.current = null;
      }

      isAutoMovingRef.current = false;

      isTransitioningRef.current = false;

      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);

        vadIntervalRef.current = null;
      }

      if (
        segmentRecorderRef.current &&
        segmentRecorderRef.current.state !== "inactive"
      ) {
        segmentRecorderRef.current.stop();
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      window.speechSynthesis.cancel();
    };
  }, []);

  // =========================================================
  // LOAD WHISPER
  // =========================================================

  useEffect(() => {
    loadWhisper()
      .then(() => {
        console.log("WHISPER TEST SUCCESS");
      })
      .catch((error) => {
        console.error("WHISPER TEST FAILED", error);
      });
  }, []);

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-350 min-h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col lg:flex-row overflow-hidden">
        {/* ================================================= */}
        {/* VIDEO SECTION */}
        {/* ================================================= */}

        <div className="w-full lg:w-[35%] bg-white flex flex-col items-center p-6 space-y-6 border-r border-gray-200">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <video
              key={videoSource}
              src={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Subtitle */}

          {subtitle && (
            <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>
            </div>
          )}

          {/* Timer */}

          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Interview Status</span>

              {isAIPlaying && (
                <span className="text-sm font-semibold text-blue-600">
                  AI Speaking
                </span>
              )}
            </div>

            <div className="h-px bg-gray-300"></div>

            <div className="flex justify-center">
              <Timer
                timeLeft={timeLeft}
                totalTime={currentQuestion?.timeLimit || 60}
              />
            </div>

            <div className="h-px bg-gray-300"></div>

            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <span className="text-2xl font-bold text-blue-600">
                  {currentIndex + 1}
                </span>

                <span className="text-xs text-gray-400 block">
                  Current Question
                </span>
              </div>

              <div>
                <span className="text-2xl font-bold text-blue-600">
                  {questions.length}
                </span>

                <span className="text-xs text-gray-400 block">
                  Total Questions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* TEXT SECTION */}
        {/* ================================================= */}

        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-600 mb-6">
            AI Smart Interview
          </h2>

          {!isIntroPhase && (
            <div className="relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-400 mb-2">
                Question {Math.min(currentIndex + 1, questions.length)} of{" "}
                {questions.length}
              </p>

              <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed">
                {currentQuestion?.question}
              </div>
            </div>
          )}

          {/* ANSWER TEXTAREA */}

          <textarea
            onChange={(e) => setAnswer(e.target.value)}
            value={answer}
            disabled={isSubmitting || feedback}
            placeholder="Type your answer here..."
            className="flex-1 bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-blue-500 transition text-gray-800"
          />

          {/* CONTROLS */}

          {!feedback ? (
            <div className="flex items-center gap-4 mt-6">
              {/* MIC BUTTON */}

              <motion.div
                onClick={toggleMic}
                whileTap={{
                  scale: 0.9,
                }}
                className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black text-white shadow-lg cursor-pointer"
              >
                {isMicOn ? (
                  <FaMicrophone size={20} />
                ) : (
                  <FaMicrophoneSlash size={20} />
                )}
              </motion.div>

              {/* SUBMIT */}

              <motion.button
                type="button"
                onClick={submitAnswer}
                disabled={isSubmitting}
                whileTap={{
                  scale: 0.95,
                }}
                className="flex-1 flex items-center justify-center bg-linear-to-r from-blue-600 to-indigo-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:bg-gray-500"
              >
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </motion.button>
            </div>
          ) : (
            /* FEEDBACK */

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="mt-6 bg-indigo-50 border border-indigo-200 p-5 rounded-2xl shadow-sm"
            >
              <p className="text-indigo-700 font-medium mb-4">{feedback}</p>

              <button
                onClick={() => handleNext(false)}
                disabled={isAutoMoving}
                className="w-full bg-linear-to-r from-blue-600 to-indigo-500 text-white py-3 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-2 disabled:bg-gray-500"
              >
                {isAutoMoving ? (
                  "Moving to Next Question..."
                ) : currentIndex === questions.length - 1 ? (
                  <>Finish Interview</>
                ) : (
                  <>
                    Next Question
                    <BsArrowRight size={18} />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step2Interview;
