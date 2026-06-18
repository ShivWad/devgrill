import "dotenv/config";
import { readFileSync } from "fs";
import { judgeNode } from "./graph/nodes/judge";
import type { InterviewStateType } from "./graph/state";

// Use the full state from a completed cli-auto.ts run
// Easiest way: add this to cli-auto.ts after the while loop:
// import { writeFileSync } from "fs";
// writeFileSync("./fixtures/last-session.json", JSON.stringify(result, null, 2));
// Then load it here:

const savedState = JSON.parse(
  readFileSync("./fixtures/last-session.json", "utf-8")
) as InterviewStateType;

const judgeResult = await judgeNode(savedState);
console.log(JSON.stringify(judgeResult, null, 2));