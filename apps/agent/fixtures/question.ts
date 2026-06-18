// src/fixtures/question-fixture.ts

import type {
  InterviewStrategy,
  QuestionConfig,
} from "../src/graph/state";

export const questionFixture: QuestionConfig = {
  title: "Design an Event-Driven Order Fulfillment System",

  description:
    "A manufacturer uses a CPQ system to generate orders. Each order must trigger orchestration across inventory, manufacturing, and shipping services. Design an event-driven system to manage this flow. How do you maintain consistency and handle failures when a downstream service fails mid-transaction?",

  difficulty: "senior",

  whyThisQuestion:
    "Tests event-driven architecture, distributed transactions, and system design depth.",

  expectedClarifications: [
    "Expected order volume",
    "Latency requirements",
    "Consistency guarantees",
    "Message broker choice",
  ],

  keyComponents: [
    "Kafka or Event Hub",
    "Saga pattern",
    "Inventory service",
    "Manufacturing service",
    "Shipping service",
    "Outbox pattern",
    "Dead letter queues",
  ],

  commonPitfalls: [
    "Synchronous service chaining",
    "Ignoring idempotency",
    "No compensation strategy",
    "No retry handling",
  ],

  deepDiveTargets: [
    "Saga orchestration",
    "Outbox pattern",
    "Kafka consumer groups",
    "Idempotency",
    "Failure recovery",
  ],
};

export const strategyFixture: InterviewStrategy = {
  resumeStrengths: [
    ".NET microservices",
    "Oracle CPQ integration",
    "Salesforce integration",
    "MuleSoft integration",
    "Docker",
  ],

  resumeGaps: [
    "Event-driven architecture",
    "Container orchestration",
  ],

  experienceHooks: [
    "Built CPQ integrations",
    "Developed ASP.NET microservices",
    "Integrated external enterprise systems",
  ],

  companyContext:
    "Accenture enterprise manufacturing clients building CPQ and quote-to-order platforms.",

  probingStrategy:
    "Challenge architecture decisions, distributed transaction handling, scaling assumptions, and operational concerns.",
};