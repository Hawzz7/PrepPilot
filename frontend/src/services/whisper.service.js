import { pipeline, env } from "@huggingface/transformers";

// Don't use local model caching through the browser filesystem.
env.allowLocalModels = false;

let transcriber = null;
let loadingPromise = null;

export const loadWhisper = async () => {
  if (transcriber) {
    return transcriber;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  console.log("========== LOADING LOCAL WHISPER ==========");

  loadingPromise = pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny.en",
    {
      device: "wasm",
      dtype: "fp32",
    }
  );

  try {
    transcriber = await loadingPromise;

    console.log("========== LOCAL WHISPER LOADED ==========");

    return transcriber;
  } catch (error) {
    console.error("Whisper loading failed:", error);

    transcriber = null;

    throw error;
  } finally {
    loadingPromise = null;
  }
};

export const transcribeAudio = async (audioBlob) => {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error("Audio is empty.");
  }

  console.log("========== TRANSCRIBING AUDIO LOCALLY ==========");

  const whisper = await loadWhisper();

  const audioUrl = URL.createObjectURL(audioBlob);

  try {
    const result = await whisper(audioUrl, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    console.log("========== WHISPER RESULT ==========");
    console.log(result);

    const transcript = result?.text?.trim() || "";

    console.log("========== WHISPER TRANSCRIPT ==========");
    console.log(transcript);

    return transcript;
  } finally {
    URL.revokeObjectURL(audioUrl);
  }
};