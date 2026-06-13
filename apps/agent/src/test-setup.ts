import { readFileSync } from "fs";
// src/test-setup.ts
import { generateQuestion } from "./graph/nodes/question-generator";
import { setupNode, buildChecklist } from "./graph/nodes/setup";
import type { InterviewStateType } from "./graph/state";

const resumeText = readFileSync("./fixtures/resume.txt", "utf-8");
const jdText = readFileSync("./fixtures/jd.txt", "utf-8");

const { question, strategy } = await generateQuestion(resumeText, jdText, "Accenture", "Senior .NET Engineer");

console.log({question , strategy});

console.log("=== CHECKLIST ===");
console.log(buildChecklist(question));

// Build a minimal fake state to pass into setupNode
const fakeState = { question, strategy } as InterviewStateType;
const result = await setupNode(fakeState);

console.log("\n=== OPENING MESSAGE ===");
console.log(result.messages?.[0].content);
console.log("\n=== INITIAL STATE FIELDS ===");
console.log({ currentPhase: result.currentPhase, phaseNotes: result.phaseNotes, turnCount: result.turnCount });