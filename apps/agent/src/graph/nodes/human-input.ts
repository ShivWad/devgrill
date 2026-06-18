import { interrupt } from "@langchain/langgraph";
import type { InterviewStateType, Message } from "../state";

/**
 * Interrupts and asks for user input.
 * @param state 
 * @returns 
 */
export function humanInputNode(
  state: InterviewStateType
): Partial<InterviewStateType> {
  // Get the last interviewer message to surface to the caller
  const lastMessage = state.messages[state.messages.length - 1];
  
  // Pause — send interviewer message to cli.ts, wait for candidate
  const candidateResponse: string = interrupt({
    message: lastMessage.content,
  });

  const candidateMessage: Message = {
    role: "candidate",
    content: candidateResponse,
    phase: state.currentPhase,
    timestamp: Date.now(),
  };

  return {
    messages: [candidateMessage],
  };
}