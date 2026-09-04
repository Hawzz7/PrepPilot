import axios from "axios";

export const askAi = async (messages, responseFormat = null) => {
  try {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages array is empty");
    }

    const body = {
      model: "openai/gpt-4o-mini",
      messages,
    };

    if (responseFormat) {
      body.response_format = responseFormat;
    }

    console.log("========== REQUEST BODY ==========");
console.log(JSON.stringify(body, null, 2));

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      body,
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("========== OPENROUTER RESPONSE ==========");
console.log(JSON.stringify(response.data, null, 2));

    const content = response?.data?.choices?.[0]?.message?.content;

    if (!content || !content.trim()) {
      throw new Error("AI returned empty response.");
    }

    return content;
  } catch (error) {
    console.error("OpenRouter Error:", error.response?.data || error.message);
    throw new Error("OpenRouter API Error.");
  }
};

// export const askAi = async (messages) => {
//   try {
//     if (!messages || !Array.isArray(messages) || messages.length === 0) {
//       throw new Error("Messages array is empty");
//     }
//     const response = await axios.post(
//       "https://openrouter.ai/api/v1/chat/completions",
//       {
//         model: "openai/gpt-4o-mini",
//         messages,
//         response_format: {
//           type: "json_object",
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       },
//     );

//     const content = response?.data?.choices?.[0]?.message?.content;

//     if (!content || !content.trim()) {
//       throw new Error("AI returned empty response.");
//     }

//     return content;
//   } catch (error) {
//     console.error("OpenRouter Error:", error.response?.data || error.message);
//     throw new Error("OpenRouter API Error.");
//   }
// };
