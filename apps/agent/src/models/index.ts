import { ChatOllama } from "@langchain/ollama";


/**
 * Interviewr model with high temperature.
 */
export const interviewerModel = new ChatOllama({
  model: "deepseek-r1:14b-qwen-distill-q4_K_M",
  baseUrl: "http://localhost:11434",
  temperature: 0.7,

});

/**
 * Reasoning model with low temperature.
 */
export const reasoningModel = new ChatOllama({
    model: "deepseek-r1:14b-qwen-distill-q4_K_M",
    baseUrl: "http://localhost:11434",
    temperature: 0.3,
});
