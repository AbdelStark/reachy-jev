import { attend, buildRoomState, decide, JevClient, toTypeSafeQuestions } from "reachy-jev";

const observation = {
  people: [{ id: "p1", bearingDeg: -18, faceHeightFraction: 0.24, lookingAtRobot: true }],
  transcriptRecent: [{ who: "p1", text: "Reachy, are you listening?" }],
};
const bank = {
  bank: "example.attention",
  version: "0.1.0",
  questions: {
    addressed: {
      type: "noul",
      instructions: "Is the most recent utterance directed at the robot?",
      criteria: "True for the robot's name or a direct question. False for talk between people.",
    },
  },
};

// A deterministic fixture keeps this example runnable without credentials or a robot.
// A real app supplies a server-side TypeSafe SDK or authenticated relay adapter here.
const client = new JevClient({
  ask: async () => ({ model: "fixture", answers: { addressed: { type: "noul", noul: 0.82 } } }),
});
const state = buildRoomState(observation);
const questions = toTypeSafeQuestions(bank, ["p1"]);
const result = await client.ask(state, questions);
if (result.stale) throw new Error("Stale model answers must not drive a fresh motion decision");

const addressed = result.answers.addressed?.noul;
if (addressed === undefined) throw new Error("Missing addressed answer");
const decision = decide(addressed, { no: 0.3, yes: 0.7 });
const target = decision === "yes" ? attend(-18) : attend(0);
console.log(JSON.stringify({ state, questions, decision, target }, null, 2));
