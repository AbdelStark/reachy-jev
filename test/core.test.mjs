import test from "node:test";
import assert from "node:assert/strict";
import { bearing, distance, elapsed, buildRoomState, decide, Hysteresis, Refractory, composite, gate, attend, suspicion, expandBank, toTypeSafeQuestions, JevClient, traceLine } from "../dist/index.js";

test("state bucketing has defined boundaries and omits unknown observations", () => {
  assert.equal(bearing(-60), "left");
  assert.equal(bearing(-8), "center");
  assert.equal(distance(0.35), "near");
  assert.equal(distance(0.1), "medium");
  assert.equal(elapsed(45), "about a minute");
  assert.throws(() => distance(1.1), RangeError);
  const state = buildRoomState({ people: [{ id: "p1", bearingDeg: -20 }], transcriptRecent: [{ who: "p1", text: "x".repeat(250) }] });
  assert.deepEqual(state.people, [{ id: "p1", bearing: "slightly left" }]);
  assert.equal(state.transcript_recent[0].text.length, 200);
  assert.equal(state.schema, "room_state@1");
  assert.equal("sound" in state, false);
  const bounded = buildRoomState({ transcriptRecent: [
    { who: "p1", text: "old" }, { who: "p1", text: "middle" }, { who: "p1", text: "new" },
  ] });
  assert.deepEqual(bounded.transcript_recent.map((u) => u.text), ["middle", "new"]);
});

test("policy primitives gate uncertain answers and throttle repeated actions", () => {
  assert.equal(decide(0.3, { no: 0.3, yes: 0.7 }), "uncertain");
  assert.equal(decide(0.71, { no: 0.3, yes: 0.7 }), "yes");
  const hysteresis = new Hysteresis(2);
  assert.equal(hysteresis.step("p1"), undefined);
  assert.equal(hysteresis.step("p1"), "p1");
  assert.equal(hysteresis.step("p2"), "p1");
  assert.equal(hysteresis.step("p2"), "p2");
  const refractory = new Refractory(3000);
  assert.equal(refractory.fire(100), true);
  assert.equal(refractory.fire(3099), false);
  assert.equal(refractory.fire(3100), true);
  assert.equal(composite({ a: 0.2, b: 0.8 }, { a: 1, b: 1 }), 0.5);
  assert.equal(gate({ choice: "p1", confidence: 0.59 }, 0.6), null);
});

test("motion is bounded abstract data, never hardware actuation", () => {
  assert.equal(attend(100).yawDeg, 45);
  assert.equal(suspicion(1).rollDeg, 15);
  assert.throws(() => suspicion(1.1), RangeError);
});

test("question expansion accepts only session-local person IDs", () => {
  const bank = { bank: "reflex.core", version: "0.1.0", questions: { attention_target: { type: "choice", instructions: "Who?", options: ["$people.ids", "none"] } } };
  assert.deepEqual(expandBank(bank, ["p1", "p2"]).attention_target.options, ["p1", "p2", "none"]);
  assert.deepEqual(toTypeSafeQuestions(bank, ["p1"]).attention_target.criteria, { p1: null, none: null });
  assert.throws(() => expandBank(bank, ["Alice"]), TypeError);
});

test("client caches identical requests and marks stale fallback after retry", async () => {
  let now = 1000;
  let calls = 0;
  let fail = false;
  const client = new JevClient({ now: () => now, sleep: async () => {}, ask: async () => {
    calls++;
    if (fail) throw Object.assign(new Error("timeout"), { status: 503 });
    return { answers: { addressed: { noul: 0.8 } }, model: "test-model" };
  } });
  assert.equal((await client.ask({ x: 1 }, { q: 1 })).stale, false);
  assert.equal((await client.ask({ x: 1 }, { q: 1 })).skipped, true);
  assert.equal(calls, 1);
  fail = true;
  now = 2200;
  const stale = await client.ask({ x: 2 }, { q: 1 });
  assert.equal(stale.stale, true);
  assert.equal(calls, 3);
});

test("trace export removes transcript and action text unless opted in", () => {
  const record = { t: 1, app: "reflex", bank: "test@0.1.0", state: { transcript_recent: [{ text: "private" }] }, answers: {}, action: { text: "private" }, latency_ms: 10, skipped: false, stale: false };
  assert.equal(traceLine(record).includes("private"), false);
  assert.equal(traceLine(record, { keepText: true }).includes("private"), true);
});
