import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const run = (source, ...args) => spawnSync(process.execPath, ["bin/reachy-jev.mjs", "questions", "lint", "-", ...args], {
  input: source,
  encoding: "utf8",
});

test("question-bank CLI accepts a versioned bank without a network call", () => {
  const source = readFileSync("examples/attention-bank.json", "utf8");
  const result = run(source, "--people", "p1,p2");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /valid example\.attention@0\.1\.0: 2 questions/);
  assert.equal(run(source).status, 0); // The explicit none option also works for an empty room.
});

test("question-bank CLI rejects malformed kinds and dynamic option collisions", () => {
  const source = JSON.parse(readFileSync("examples/attention-bank.json", "utf8"));
  source.questions.addressed.type = "bool";
  const invalid = run(JSON.stringify(source));
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /unknown question type: addressed/);
  source.questions.addressed.type = "noul";
  source.questions.target.options = ["$people.ids", "p1"];
  assert.equal(run(JSON.stringify(source), "--people", "p1").status, 1);
});
