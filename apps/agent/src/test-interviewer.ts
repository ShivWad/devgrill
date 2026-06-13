// src/test-interviewer.ts
import { buildChecklist, invokeWithMetrics } from "../utils";
import { interviewerNode } from "./graph/nodes/interviewer";
import { generateQuestion } from "./graph/nodes/question-generator";
import type { InterviewStateType, Message } from "./graph/state";
import { readFileSync } from "fs";


const resumeText = readFileSync("./fixtures/resume.txt", "utf-8");
const jdText = readFileSync("./fixtures/jd.txt", "utf-8");

const { question, strategy } = await generateQuestion(resumeText, jdText, "Accenture", "Senior .NET Engineer");
const checklist = buildChecklist(question);




const fakeMessages: Message[] = [
  { role: "interviewer", content: "We need an API gateway handling 10,000+ TPS for a fintech project. Where would you like to start?", phase: "requirements", timestamp: Date.now() },
  { role: "candidate", content: "What's the expected traffic pattern — steady or bursty?", phase: "requirements", timestamp: Date.now() },
  { role: "interviewer", content: "Bursty — peak traffic can hit 3x average during market open hours.", phase: "requirements", timestamp: Date.now() },
  { role: "candidate", content: "Okay, we'd probably want a rate limiter and some caching.", phase: "requirements", timestamp: Date.now() }, // deliberately vague
];

const fakeMessages2: Message[] = [
  { role: "interviewer", content: "We need an API gateway handling 10,000+ TPS for a fintech project. Where would you like to start?", phase: "requirements", timestamp: Date.now() },
  { role: "candidate", content: "Are there specific regulatory compliance requirements — like PCI-DSS — that the gateway needs to support?", phase: "requirements", timestamp: Date.now() },
];

const fakeState = {
  question, strategy, targetRole: "Senior .NET Engineer",
  currentPhase: "requirements",
  messages: fakeMessages2,
  coverageChecklist: checklist,
} as InterviewStateType;

const result = await interviewerNode(fakeState);
console.log(result.messages?.[0].content);