import { StateGraph, START, END } from "@langchain/langgraph";
import { TechInterviewState } from "./state";
import { techQuestionGeneratorNode } from "./nodes/question-generator";
import { techSetupNode } from "./nodes/setup";
import { techInterviewerNode } from "./nodes/interviewer";
import { techHumanInputNode } from "./nodes/human-input";
import { techPhaseEvaluatorNode } from "./nodes/phase-evaluator";
import { techJudgeNode } from "./nodes/judge";
import { techReportGeneratorNode } from "./nodes/report-generator";
import type { TechInterviewStateType } from "./state";

function routeAfterTechEvaluator(
  state: TechInterviewStateType,
): "tech_interviewer" | "tech_judge" {
  return state.interviewComplete ? "tech_judge" : "tech_interviewer";
}

export const techGraph = new StateGraph(TechInterviewState)
  .addNode("tech_question_generator", techQuestionGeneratorNode)
  .addNode("tech_setup", techSetupNode)
  .addNode("tech_interviewer", techInterviewerNode)
  .addNode("tech_human_input", techHumanInputNode)
  .addNode("tech_phase_evaluator", techPhaseEvaluatorNode)
  .addNode("tech_judge", techJudgeNode)
  .addNode("tech_report_generator", techReportGeneratorNode)
  .addEdge(START, "tech_question_generator")
  .addEdge("tech_question_generator", "tech_setup")
  .addEdge("tech_setup", "tech_interviewer")
  .addEdge("tech_interviewer", "tech_human_input")
  .addEdge("tech_human_input", "tech_phase_evaluator")
  .addConditionalEdges("tech_phase_evaluator", routeAfterTechEvaluator, {
    tech_interviewer: "tech_interviewer",
    tech_judge: "tech_judge",
  })
  .addEdge("tech_judge", "tech_report_generator")
  .addEdge("tech_report_generator", END);
