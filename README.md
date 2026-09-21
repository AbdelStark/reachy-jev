# reachy-jev

Typed decision primitives for Reachy Mini apps. Perception stays with the app; this library turns observations into compact Jev state, applies deterministic policy, and returns abstract motion targets. It never drives motors or treats a model answer as a safety interlock.

The source is public as a development preview, with a browser signal panel, an optional React wrapper, and a [Python core](python/README.md). The packages are installable from the pinned Git tag below; neither has been published to npm or PyPI. No live Jev, latency, accuracy, or hardware compatibility result is claimed.

## Install

Node.js 20+ is required. Install the versioned source tag; npm runs this package's TypeScript `prepare` build during a Git install:

```sh
npm install 'github:AbdelStark/reachy-jev#v0.0.1'
```

The lockfile records the resolved commit. For stronger supply-chain pinning, use the exact commit SHA and review the package's `prepare` script. React is an optional peer dependency and is needed only for `reachy-jev/react`.

## Example

Run the [complete fixture example](examples/room-decision.mjs) with `npm run example`. It builds a bucketed room state, expands a versioned question bank, obtains a fake typed answer, gates that answer in code, and returns an abstract pose. It needs no API key or robot. Replace only the `ask` adapter with your authenticated TypeSafe SDK or relay call; never place an API key in browser JavaScript.

`JevClient` caches identical state briefly, retries one transient failure, and marks fallback answers stale. Apps must not actuate from stale answers. State omits unknown fields, caps transcript text, and keeps it in a data field.

`traceLine(record)` exports only timing and stale/skip metadata by default (`reachy_jev.trace_meta@1`). It omits app/model labels, state, answers, and action entirely: a short denylist cannot reliably identify private text in arbitrary nested data. `{ keepText: true }` exports the **whole record**, not just selected text fields, and is appropriate only after consent and a caller-owned privacy review. Metadata such as timestamps may still be sensitive; this is not anonymization.

## Browser panel

`reachy-jev/panel` registers two custom elements and is intentionally separate from the Node-safe root import. It has no React or CSS-framework dependency.

```ts
import "reachy-jev/panel";
import type { JevPanelElement } from "reachy-jev/panel";

const panel = document.createElement("jev-panel") as JevPanelElement;
document.body.append(panel);
panel.update({
  model: "jev-latest",
  latencyMs: 118,
  gauges: [
    { key: "addressed", label: "Addressed", p: 0.82, type: "noul" },
    { key: "attention", label: "Attention", p: 0.45, confidence: 0.4, type: "choice" },
  ],
});
```

The panel accepts already-validated probabilities, not raw SDK response objects. Callers decide how to map a Choice or Score to a 0–1 display value. A stale frame is visibly marked; synthetic previews must set `source: "fixture"` so they are not labeled live. `confidence < 0.5` hatches the corresponding gauge. Labels are inserted as text, never HTML. The panel is visual feedback, not an authority for motion or safety decisions.

React apps can import `JevPanel` from `reachy-jev/react` and pass the same `frame` object. React is an optional peer dependency; the wrapper renders on the server without accessing browser globals, then registers the custom element and updates it on the client.

Run `npm ci`, `npm run check`, and `npm test` on Node.js 20+. For browser checks, run `npx playwright install chromium` and `npm run test:browser`. Tests use fake answers and need no credentials or robot.

The Python core supports 3.10+ without runtime dependencies and mirrors the state, question, policy, motion, client, and trace primitives. From `python/`, run `uv sync --dev`, `uv run ruff check src tests examples`, `uv run pytest`, and `uv build`. The built wheel is checked in an isolated consumer; the Python package has not been published to PyPI.

MIT licensed. See [CHANGELOG.md](CHANGELOG.md), [CITATION.cff](CITATION.cff), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).
