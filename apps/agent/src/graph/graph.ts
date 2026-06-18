import { StateGraph, START, END } from "@langchain/langgraph";
import { InterviewState } from "./state";
import { questionGeneratorNode } from "./nodes/question-generator";
import { setupNode } from "./nodes/setup";
import { interviewerNode } from "./nodes/interviewer";
import { phaseEvaluatorNode } from "./nodes/phase-evaluator";
import { judgeNode } from "./nodes/judge";
import { routeAfterEvaluator } from "../utils/routing";
import { humanInputNode } from "./nodes/human-input";
import { reportGeneratorNode } from "./nodes/report-generator";

export const graph = new StateGraph(InterviewState)
  .addNode("question_generator", questionGeneratorNode)
  .addNode("setup", setupNode)
  .addNode("interviewer", interviewerNode)
  .addNode("human_input", humanInputNode)
  .addNode("phase_evaluator", phaseEvaluatorNode)
  .addNode("judge", judgeNode)
  .addNode("report_generator", reportGeneratorNode)
  .addEdge(START, "question_generator")
  .addEdge("question_generator", "setup")
  .addEdge("setup", "interviewer")
  .addEdge("interviewer", "human_input")
  .addEdge("human_input", "phase_evaluator")
  .addConditionalEdges("phase_evaluator", routeAfterEvaluator, {
    interviewer: "interviewer",
    judge: "judge",
  })
  .addEdge("judge", "report_generator")
  .addEdge("report_generator", END);
