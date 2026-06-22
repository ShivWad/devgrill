import { interrupt } from "@langchain/langgraph";
import type { TechInterviewStateType, Message } from "../state";

export function techHumanInputNode(
  state: TechInterviewStateType,
): Partial<TechInterviewStateType> {
  const lastMessage = state.messages[state.messages.length - 1];

  const candidateResponse: string = interrupt({
    message: lastMessage.content,
  });

  const candidateMessage: Message = {
    role: "candidate",
    content: candidateResponse,
    phase: state.currentPhase as never,
    timestamp: Date.now(),
  };

  return {
    messages: [candidateMessage],
  };
}
