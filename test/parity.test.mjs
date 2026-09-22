import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRoomState, toTypeSafeQuestions, attend, suspicion } from "../dist/index.js";

const fixture = JSON.parse(readFileSync(new URL("../python/tests/fixtures/parity.json", import.meta.url), "utf8"));

test("shared golden fixture matches TypeScript state, wire questions, and abstract motion", () => {
  assert.deepEqual(buildRoomState(fixture.observation), fixture.state);
  assert.deepEqual(buildRoomState(fixture.unknownObservation), fixture.unknownState);
  assert.deepEqual(toTypeSafeQuestions(fixture.bank, ["p1", "p2"]), fixture.questions);
  assert.deepEqual(attend(-18), fixture.attend);
  assert.deepEqual(suspicion(0.5), fixture.suspicion);
});
