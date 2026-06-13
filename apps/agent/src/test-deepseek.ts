// src/test-deepseek.ts
import { reasoningModel, interviewerModel } from "./models";

const res = await reasoningModel.invoke("Respond with ONLY valid JSON: {\"ok\": true}");
console.log("reasoning:", res.content);

const res2 = await interviewerModel.invoke("Say hello in 5 words.");
console.log("interviewer:", res2.content);