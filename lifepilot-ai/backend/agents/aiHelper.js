/**
 * AI Helper Utility
 * Manages Google Gen AI (Gemini) SDK initialization, prompts, and mock fallbacks.
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const isMockEnabled = process.env.ENABLE_MOCK_AI === "true" || !apiKey;

let aiClient = null;

if (!isMockEnabled && apiKey) {
  try {
    // Initializing the unified @google/genai client
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.error("Failed to initialize Google Gen AI SDK:", err.message);
  }
}

/**
 * Validates inputs for basic safety and checks for prompt injection patterns.
 * @param {string} text - User input string.
 * @returns {string} Sanitized input.
 */
export function sanitizeInput(text = "") {
  if (typeof text !== "string") return "";
  
  // Basic security: strip potential HTML tags
  let cleaned = text.replace(/<[^>]*>/g, "");
  
  // Prompt Injection Guard: Detect typical override flags
  const injectionPatterns = [
    /ignore previous instructions/i,
    /system instructions/i,
    /you are now/i,
    /forget everything/i,
    /override/i,
    /bypass/i
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(cleaned)) {
      console.warn("Security Warning: Detected potential prompt injection attempt. Sanitizing input...");
      cleaned = cleaned.replace(pattern, "[Security Filtered: Instruction Override Attempted]");
    }
  }
  
  return cleaned.trim();
}

/**
 * Runs a content generation request through Gemini, or handles mock fallback.
 * @param {Object} options - { systemInstructions, prompt, model, mockCallback }
 * @returns {Promise<string>} LLM response text.
 */
export async function generateContent({
  systemInstructions = "",
  prompt = "",
  model = "gemini-2.5-flash",
  mockCallback = () => ""
}) {
  const sanitizedPrompt = sanitizeInput(prompt);

  // If mock mode is enabled or client initialization failed, use local mock logic
  if (isMockEnabled || !aiClient) {
    console.log(`[AI Helper] Mock Mode active. Simulating response for agent...`);
    // Add small delay to mimic network latency for loading indicators
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockCallback(sanitizedPrompt);
  }

  try {
    // Call Gemini API
    const response = await aiClient.models.generateContent({
      model: model,
      contents: sanitizedPrompt,
      config: {
        systemInstruction: systemInstructions,
        // High fidelity outputs
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    console.log("[AI Helper] Falling back to mock generator due to API error...");
    return mockCallback(sanitizedPrompt);
  }
}
