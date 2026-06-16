import "dotenv/config";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOllama } from "@langchain/ollama";

// ─────────────────────────────────────────────────────────
// DeepSeek models
// ─────────────────────────────────────────────────────────
// API key is read from DEEPSEEK_API_KEY env var automatically.

/**
 *  Heavier reasoning model — question generator, judge
 */
export const reasoningModel = new ChatDeepSeek({
  model: "deepseek-v4-pro",
  temperature: 0.3, // lower = more consistent JSON output
});

/**
 * Cheaper/faster model — interviewer conversational turns
 */
export const interviewerModel = new ChatDeepSeek({
  model: "deepseek-v4-flash",
  temperature: 0.5,
});


export const judgeModel = new ChatDeepSeek({
  model: "deepseek-v4-flash",
  temperature: 0.1,  // near-deterministic
});


// ─────────────────────────────────────────────────────────
// Ollama models — kept for quick local comparison/fallback testing
// ─────────────────────────────────────────────────────────

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export const reasoningModelLocal = new ChatOllama({
  model: "deepseek-r1:14b-qwen-distill-q4_K_M",
  baseUrl: OLLAMA_BASE_URL,
  temperature: 0.3,
});

export const interviewerModelLocal = new ChatOllama({
  model: "qwen3:8b",
  baseUrl: OLLAMA_BASE_URL,
  temperature: 0.7,
});