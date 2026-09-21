# reachy-jev

Typed decision primitives for Reachy Mini apps. Perception stays with the app; this library turns observations into compact Jev state, applies deterministic policy, and returns abstract motion targets. It never drives motors or treats a model answer as a safety interlock.

This is an in-development TypeScript core. The Python distribution, browser panel, and hardware integrations are not yet released. No latency, accuracy, or hardware compatibility is claimed yet.

## Example

```ts
import { buildRoomState, JevClient, decide, suspicion, toTypeSafeQuestions } from "reachy-jev";

const state = buildRoomState({
  people: [{ id: "p1", bearingDeg: -18, faceHeightFraction: 0.24 }],
  transcriptRecent: [{ who: "p1", text: "Reachy, are you listening?" }],
});
const client = new JevClient({
  ask: (state, questions) => typesafeClient.systemOne({ state, questions }),
});
const questions = toTypeSafeQuestions(bank, ["p1"]);
const result = await client.ask(state, questions);
const band = decide(result.answers.addressed.noul, { no: 0.3, yes: 0.7 });
const pose = suspicion(0.75); // application translates target to SDK commands
```

`JevClient` caches identical state briefly, retries one transient failure, and marks fallback answers stale. Apps must not actuate from stale answers. State omits unknown fields, caps transcript text, and keeps it in a data field.

Run `npm ci`, `npm run check`, and `npm test` on Node.js 20+. Tests use a fake adapter and need no credentials or robot.

MIT licensed. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
