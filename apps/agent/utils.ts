
/**
 * defensively strips markdown fences, stray <think> blocks, and leading/
 * trailing prose before parsing, so a minor format slip doesn't hard-fail
 * the run.
 * @param raw 
 * @returns 
 */
export const extractJson = (raw: string): string => {
  let text = raw.trim();

  // Strip <think>...</think> blocks some reasoning-distilled models emit
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // If there's still leading/trailing prose, grab the outermost {...}
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return text;
};


/**
 * Strip <think> blocks from stage 1 output too — keeps stage 2's prompt
 * focused on the actual analysis, not the model's internal monologue.
 * @param raw 
 * @returns 
 */
export const stripThinkTags = (raw: string): string => {
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
};
