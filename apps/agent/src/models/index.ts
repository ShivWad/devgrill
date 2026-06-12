import {ChatOllama} from "@langchain/ollama"

export const interviewerModel = new ChatOllama({ model: "qwen3:8b", baseUrl: "http://localhost:11434" });
export const reasoningModel = new ChatOllama({ model: "qwen3:8b", baseUrl: "http://localhost:11434" });