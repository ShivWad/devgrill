import { InterviewStateType } from "../state";

// nodes/judge.ts
export async function judgeNode(
  state: InterviewStateType
): Promise<Partial<InterviewStateType>> {
  console.log("=== INTERVIEW COMPLETE — Judge stub ===");
  console.log(`Total turns: ${state.turnCount}`);
  console.log(`Transcript length: ${state.messages.length} messages`);
  return {
    reportMarkdown: "# Interview Complete\n\nJudge node not yet implemented."
  };
}