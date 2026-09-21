export type NoulQuestion = { type: "noul"; instructions: string; criteria?: string };
export type ChoiceQuestion = { type: "choice"; instructions: string; options: readonly string[] };
export type ScoreQuestion = { type: "score"; instructions: string; levels: readonly string[] };
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export interface QuestionBank { bank: string; version: string; questions: Record<string, Question> }
export type WireQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, null> }
  | { type: "score"; instructions: string; criteria: readonly [string, string, ...string[]] };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function fields(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

/** Expand the only dynamic token supported by the bank format. Never interpolate transcript text. */
export function expandBank(bank: QuestionBank, personIds: readonly string[]): Record<string, Question> {
  if (!record(bank) || typeof bank.bank !== "string" || !/^[a-z][a-z0-9_.-]*$/.test(bank.bank) || typeof bank.version !== "string" || !/^\d+\.\d+\.\d+$/.test(bank.version)) throw new TypeError("invalid bank identity");
  if (!record(bank.questions) || !Object.keys(bank.questions).length) throw new TypeError("empty question bank");
  if (!Array.isArray(personIds)) throw new TypeError("invalid person IDs");
  const ids = [...new Set(personIds)];
  if (ids.some((id) => typeof id !== "string" || !/^p[1-9]$/.test(id))) throw new TypeError("invalid person ID");
  return Object.fromEntries(Object.entries(bank.questions).map(([key, question]) => {
    if (!/^[a-z][a-z0-9_]*$/.test(key) || !record(question) || !nonempty(question.instructions)) throw new TypeError(`invalid question: ${key}`);
    if (question.type === "choice") {
      if (!fields(question, ["type", "instructions", "options"]) || !Array.isArray(question.options) || question.options.some((option) => !nonempty(option))) throw new TypeError(`invalid choice options: ${key}`);
      const options = question.options.flatMap((option) => option === "$people.ids" ? ids : [option]);
      if (!options.length || new Set(options).size !== options.length) throw new TypeError(`invalid choice options: ${key}`);
      return [key, { ...question, options }];
    }
    if (question.type === "score") {
      if (!fields(question, ["type", "instructions", "levels"]) || !Array.isArray(question.levels) || question.levels.length < 2 || question.levels.some((level) => !nonempty(level)) || new Set(question.levels).size !== question.levels.length) throw new TypeError(`invalid score levels: ${key}`);
      return [key, question];
    }
    if (question.type === "noul") {
      if (!fields(question, ["type", "instructions", "criteria"]) || (question.criteria !== undefined && !nonempty(question.criteria))) throw new TypeError(`invalid noul criteria: ${key}`);
      return [key, question];
    }
    throw new TypeError(`unknown question type: ${key}`);
  }));
}

/** Convert the human-readable bank into the TypeSafe JS SDK's actual request shape. */
export function toTypeSafeQuestions(bank: QuestionBank, personIds: readonly string[]): Record<string, WireQuestion> {
  const expanded = expandBank(bank, personIds);
  const wire: Record<string, WireQuestion> = {};
  for (const [key, question] of Object.entries(expanded)) {
    const instructions = question.type === "noul" && question.criteria
      ? `${question.instructions} Criteria: ${question.criteria}`
      : question.instructions;
    if (question.type === "choice") {
      wire[key] = { type: "choice", instructions, criteria: Object.fromEntries(question.options.map((option) => [option, null])) };
    } else if (question.type === "score") {
      // expandBank already requires at least two levels; retain that invariant in the type.
      wire[key] = { type: "score", instructions, criteria: [...question.levels] as [string, string, ...string[]] };
    } else {
      wire[key] = { type: "noul", instructions };
    }
  }
  return wire;
}
