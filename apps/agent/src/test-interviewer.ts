// src/test-interviewer.ts
import { questionFixture, strategyFixture } from "../fixtures/question";
import { buildChecklist, invokeWithMetrics } from "../utils";
import { interviewerNode } from "./graph/nodes/interviewer";
import { generateQuestion } from "./graph/nodes/question-generator";
import type { InterviewStateType, Message, Phase } from "./graph/state";
import { readFileSync } from "fs";


const checklist = buildChecklist(questionFixture);

const fakeMessages: Message[] = [
  {
    role: "interviewer",
    content:
      "We need an API gateway handling 10,000+ TPS for a fintech project. Where would you like to start?",
    phase: "requirements",
    timestamp: Date.now(),
  },
  {
    role: "candidate",
    content: "What's the expected traffic pattern — steady or bursty?",
    phase: "requirements",
    timestamp: Date.now(),
  },
  {
    role: "interviewer",
    content:
      "Bursty — peak traffic can hit 3x average during market open hours.",
    phase: "requirements",
    timestamp: Date.now(),
  },
  {
    role: "candidate",
    content: "Okay, we'd probably want a rate limiter and some caching.",
    phase: "requirements",
    timestamp: Date.now(),
  }, // deliberately vague
];

const fakeMessages2: Message[] = [
  {
    role: "interviewer",
    content:
      "We need an API gateway handling 10,000+ TPS for a fintech project. Where would you like to start?",
    phase: "requirements",
    timestamp: Date.now(),
  },
  {
    role: "candidate",
    content:
      "Are there specific regulatory compliance requirements — like PCI-DSS — that the gateway needs to support?",
    phase: "requirements",
    timestamp: Date.now(),
  },
];

const designMessages: Message[] = [
  {
    role: "interviewer",
    content: "Let's move into the design.",
    phase: "design",
    timestamp: Date.now(),
  },
  {
    role: "candidate",
    content:
      "I'd have an API Gateway, Order Service, Inventory Service, and a Kafka cluster.",
    phase: "design",
    timestamp: Date.now(),
  },
];

const designMessages2: Message[] = [
  {
    role: "candidate",
    content:
      "User submits an order through the gateway. Order Service writes the order and publishes an event consumed by Inventory Service.",
    phase: "design",
    timestamp: Date.now(),
  },
];

const deepDiveMessages: Message[] = [
  {
    role: "candidate",
    content:
      "I'd use Kafka between services.",
    phase: "deep_dive",
    timestamp: Date.now(),
  },
];

const deepDiveMessages2: Message[] = [
  {
    role: "candidate",
    content:
      "I'd use a Saga pattern for order fulfillment.",
    phase: "deep_dive",
    timestamp: Date.now(),
  },
];

const deepDiveMessages3: Message[] = [
  {
    role: "candidate",
    content:
      "I'd rely on eventual consistency between services.",
    phase: "deep_dive",
    timestamp: Date.now(),
  },
];

const scaleMessages: Message[] = [
  {
    role: "candidate",
    content:
      "The system should scale horizontally by adding more instances.",
    phase: "scale",
    timestamp: Date.now(),
  },
];

const scaleMessages2: Message[] = [
  {
    role: "candidate",
    content:
      "We're expecting around 1,000 requests per second.",
    phase: "scale",
    timestamp: Date.now(),
  },
];


async function runPhaseTest(
  phase: Phase,
  messages: Message[]
) {
  const state: Partial<InterviewStateType> = {
    question: questionFixture,
    strategy: strategyFixture,
    targetRole: "Senior .NET Engineer",
    currentPhase: phase,
    messages,
    coverageChecklist: checklist,
  };

  const result = await interviewerNode(state as InterviewStateType);

  console.log("\n=================");
  console.log(`PHASE: ${phase}`);
  console.log("=================");
  console.log(result.messages?.[0].content);
}

await runPhaseTest("requirements", fakeMessages2);
await runPhaseTest("design", designMessages2);
await runPhaseTest("deep_dive", deepDiveMessages2);
await runPhaseTest("scale", scaleMessages2);