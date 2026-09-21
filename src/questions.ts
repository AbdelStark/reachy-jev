export type NoulQuestion = { type: "noul"; instructions: string; criteria?: string };
export type ChoiceQuestion = { type: "choice"; instructions: string; options: readonly string[] };
export type ScoreQuestion = { type: "score"; instructions: string; levels: readonly string[] };
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;
export interface QuestionBank { bank: string; version: string; questions: Record<string, Question> }

/** Expand the only dynamic token supported by the bank format. Never interpolate transcript text. */
export function expandBank(bank: QuestionBank, personIds: readonly string[]): Record<string, Question> {
  if (!/^[a-z][a-z0-9_.-]*$/.test(bank.bank) || !/^\d+\.\d+\.\d+$/.test(bank.version)) throw new TypeError("invalid bank identity");
  if (!Object.keys(bank.questions).length) throw new TypeError("empty question bank");
  const ids = [...new Set(personIds)];
  if (ids.some((id) => !/^p[1-9]$/.test(id))) throw new TypeError("invalid person ID");
  return Object.fromEntries(Object.entries(bank.questions).map(([key, question]) => {
    if (!/^[a-z][a-z0-9_]*$/.test(key) || !question.instructions.trim()) throw new TypeError("invalid question");
    if (question.type === "choice") {
      const options = question.options.flatMap((option) => option === "$people.ids" ? ids : [option]);
      if (!options.length || new Set(options).size !== options.length) throw new TypeError(`invalid choice options: ${key}`);
      return [key, { ...question, options }];
    }
    if (question.type === "score" && (!question.levels.length || new Set(question.levels).size !== question.levels.length)) throw new TypeError(`invalid score levels: ${key}`);
    return [key, question];
  }));
}
