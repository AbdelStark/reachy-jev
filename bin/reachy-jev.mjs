#!/usr/bin/env node
/** Structural lint for a local, versioned JSON question bank. No network calls. */
import { readFileSync } from "node:fs";
import { expandBank } from "../dist/questions.js";

const usage = "Usage: reachy-jev questions lint <bank.json|-> [--people p1,p2]";
const args = process.argv.slice(2);
if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
  console.log(usage);
  process.exit(0);
}
if (args.length !== 3 && args.length !== 5 || args[0] !== "questions" || args[1] !== "lint" || (args.length === 5 && args[3] !== "--people")) {
  console.error(usage);
  process.exit(2);
}

try {
  const source = readFileSync(args[2] === "-" ? 0 : args[2], "utf8");
  const bank = JSON.parse(source);
  const people = args.length === 5 ? args[4].split(",") : [];
  const questions = expandBank(bank, people);
  console.log(`valid ${bank.bank}@${bank.version}: ${Object.keys(questions).length} questions`);
} catch (error) {
  console.error(`invalid question bank: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}
