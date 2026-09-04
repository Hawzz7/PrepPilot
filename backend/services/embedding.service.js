import axios from "axios";

export const generateEmbedding = async (text) => {
  try {
    if (!text || !text.trim()) {
      throw new Error("Text is required for embedding.");
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/embeddings",
      {
        model: "baai/bge-m3",
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data[0].embedding;
  } catch (error) {
    console.error(
      "Embedding Error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to generate embedding.");
  }
};