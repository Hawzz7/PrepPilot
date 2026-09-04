import ResumeChunk from "../models/resumeChunk.model.js";
import { createResumeChunks } from "../utils/createResumeChunks.js";
import { generateEmbedding } from "./embedding.service.js";
import { askAi } from "./openRouter.service.js";

export const storeResumeEmbeddings = async ({ user, parsedResume }) => {
  const chunks = createResumeChunks(parsedResume);

  const resumeChunks = [];

  console.log("Generating embeddings...");

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Embedding ${i + 1}/${chunks.length}`);

    const embedding = await generateEmbedding(chunks[i].text);

    if (!embedding || embedding.length === 0) {
      throw new Error(`Embedding generation failed for chunk ${i + 1}`);
    }

    resumeChunks.push({
      userId: user._id,

      chunkIndex: i,

      type: chunks[i].type,

      text: chunks[i].text,

      embedding,

      candidateName: parsedResume.candidate.name,

      candidateRole: parsedResume.candidate.role,
    });
  }

  await ResumeChunk.deleteMany({
    userId: user._id,
  });

  await ResumeChunk.insertMany(resumeChunks);

  console.log(`${resumeChunks.length} embeddings stored.`);
};

export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB) return 0;

  if (vecA.length !== vecB.length) {
    throw new Error("Embedding dimensions do not match.");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];

    magnitudeA += vecA[i] * vecA[i];

    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

export const retrieveRelevantChunks = async ({ userId, query, topK = 5 }) => {
  // 1. Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error("Failed to generate query embedding.");
  }

  // 2. Fetch all resume chunks of the user
  console.log("Searching for userId:", userId);

  const allChunks = await ResumeChunk.find();

  console.log("Total chunks in DB:", allChunks.length);

  console.log(
    "UserIds in DB:",
    allChunks.map((chunk) => chunk.userId.toString()),
  );

  const resumeChunks = await ResumeChunk.find({
    userId: userId,
  });

  console.log("Matched chunks:", resumeChunks.length);

  if (!resumeChunks.length) {
    throw new Error("No resume embeddings found.");
  }

  // 3. Calculate similarity
  const scoredChunks = resumeChunks.map((chunk) => ({
    ...chunk.toObject(),
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // 4. Sort descending
  scoredChunks.sort((a, b) => b.score - a.score);

  // 5. Return top K
  return scoredChunks.slice(0, topK);
};

const buildContext = (chunks) => {
  return chunks
    .map(
      (chunk) => `
============================
${chunk.type.toUpperCase()}
============================

${chunk.text}
`,
    )
    .join("\n");
};

export const generateQuestionsWithRAG = async ({
  userId,
  role,
  experience,
  mode,
  numberOfQuestions = 5,
}) => {
  // Step 1: Retrieve relevant resume chunks
  const retrievedChunks = await retrieveRelevantChunks({
    userId,
    query: `${role} ${mode} interview questions`,
    topK: 5,
  });

  // Step 2: Convert chunks into context
  const context = buildContext(retrievedChunks);

  // Step 3: Prompt for OpenRouter
  const messages = [
    {
      role: "system",
      content: `
You are a Senior Technical Interviewer with over 15 years of experience interviewing software engineers at companies like Google, Microsoft, Amazon and Meta.

Your task is to generate highly personalized interview questions based ONLY on the retrieved resume context.

Return ONLY valid JSON.

Return an array of exactly ${numberOfQuestions} objects.

JSON format:

[
  {
    "question": "",
    "difficulty": "",
    "timeLimit": 0,
    "type": "primary"
  }
]

Difficulty Distribution:

Question 1 → Easy (60 seconds)

Question 2 → Easy (60 seconds)

Question 3 → Medium (120 seconds)

Question 4 → Medium (120 seconds)

Question 5 → Hard (180 seconds)

Rules:

- Questions MUST be based on the retrieved resume context.
- Ask about projects before asking theory.
- Ask implementation questions.
- Ask "why" and "how" questions.
- Avoid generic textbook questions.
- Do not ask duplicate questions.
- Do not mention technologies not present in the resume.
- Return ONLY JSON.
- Do NOT return markdown.
- Do NOT explain anything.
`,
    },
    {
      role: "user",
      content: `
Job Role

${role}

Interview Mode

${mode}

Candidate Experience

${experience}

Retrieved Resume Context

${context}

Generate exactly ${numberOfQuestions} interview questions.
`,
    },
  ];

  // Step 4: Ask OpenRouter
  const aiResponse = await askAi(messages);

  // Step 5: Clean markdown if present
  const cleanedResponse = aiResponse
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // Step 6: Return parsed JSON
  return JSON.parse(cleanedResponse);
};
