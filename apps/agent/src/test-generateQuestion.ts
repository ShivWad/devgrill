
import { readFileSync } from "fs";
import { generateQuestion } from "./graph/nodes/question-generator";

const resumeText = readFileSync("./fixtures/resume.txt", "utf-8");
const jdText = readFileSync("./fixtures/jd.txt", "utf-8");

const result = await generateQuestion(
  resumeText,
  jdText,
  "Accenture",        // or whatever company is in your JD
  "Custom Software Engineer"
);

console.log(JSON.stringify(result, null, 2));