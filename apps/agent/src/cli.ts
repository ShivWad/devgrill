import "dotenv/config";
import * as readline from "readline/promises";
import { readFileSync, writeFileSync } from "fs";
import { Command, isGraphInterrupt } from "@langchain/langgraph";
import { compiledGraph } from "./graph/graph";
import { printSessionSummary } from "../utils";
import { interviewerModel } from "./models";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const resumeText = readFileSync("./fixtures/resume.txt", "utf-8");
const jdText = readFileSync("./fixtures/jd.txt", "utf-8");

const threadId = `session-${Date.now()}`;
const config = { configurable: { thread_id: threadId } };

console.log("⏳ Generating your personalized question...\n");

// Initial invoke — runs question_generator → setup → interviewer → interrupt()
let result: any = await compiledGraph.invoke(
  {
    resumeText,
    jdText,
    targetCompany: "Accenture",
    targetRole: "Senior .NET Engineer",
  },
  config,
);

// Loop until graph reaches END (no more interrupts)
while (result.__interrupt__?.length) {
  const interviewerMessage = result.__interrupt__[0].value.message;

  console.log("\n🧑‍💼  INTERVIEWER:");
  console.log(interviewerMessage);

  const transcript = result.messages
    .map((m: any) =>
      m.role === "interviewer"
        ? `Interviewer: ${m.content}`
        : `You: ${m.content}`,
    )
    .join("\n");

  const candidateRes = await interviewerModel.invoke(`
You are a senior .NET engineer with 4 years of experience being interviewed 
for a Senior .NET Engineer role at Accenture. You have experience with 
ASP.NET microservices, Docker, Azure, Oracle CPQ integration, and 3D 
product configurators.

You are NOT perfect — you know your stuff but occasionally miss edge cases 
or make reasonable assumptions that the interviewer might challenge. Answer 
naturally, like a real candidate, not like a textbook. Keep answers to 
3-6 sentences unless the question genuinely needs more detail.

You MUST respond with at least one sentence. Never return an empty response.

CONVERSATION SO FAR:
${transcript}

Now respond to the interviewer's last message as the candidate. 
Respond ONLY with what you would say out loud — no labels, no "Candidate:", 
no preamble.
`);

  let candidateAnswer = (candidateRes.content as string).trim();

  if (!candidateAnswer) {
    console.warn(
      "⚠️  Candidate model returned empty response — using fallback",
    );
    candidateAnswer = "Could you clarify what you're looking for?";
  }

  console.log("\n💬  CANDIDATE (auto):");
  console.log(candidateAnswer);

  result = await compiledGraph.invoke(
    new Command({ resume: candidateAnswer }),
    config,
  );

  //   const candidateAnswer = await rl.question("💬  YOU: ");

  //   result = await compiledGraph.invoke(
  //     new Command({ resume: candidateAnswer }),
  //     config,
  //   );
}

writeFileSync(
  "./fixtures/last-session.json",
  JSON.stringify(result, null, 2)
);


console.log("\n════════════════════════════════");
console.log("       INTERVIEW COMPLETE        ");
console.log("════════════════════════════════\n");
console.log(result.reportMarkdown);

printSessionSummary();

rl.close();
