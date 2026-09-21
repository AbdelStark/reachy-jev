# reachy-jev

Typed decision primitives for Reachy Mini apps. Perception stays with the app; this library turns observations into compact Jev state, applies deterministic policy, and returns abstract motion targets. It never drives motors or treats a model answer as a safety interlock.

This is an in-development TypeScript package with a browser signal panel and an optional React wrapper. A [Python core](python/README.md) lives alongside it; neither distribution nor hardware integrations have been publicly released. No latency, accuracy, or hardware compatibility is claimed yet.

## Example

Run the [complete fixture example](examples/room-decision.mjs) with `npm run example`. It builds a bucketed room state, expands a versioned question bank, obtains a fake typed answer, gates that answer in code, and returns an abstract pose. It needs no API key or robot. Replace only the `ask` adapter with your authenticated TypeSafe SDK or relay call; never place an API key in browser JavaScript.

`JevClient` caches identical state briefly, retries one transient failure, and marks fallback answers stale. Apps must not actuate from stale answers. State omits unknown fields, caps transcript text, and keeps it in a data field.

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

MIT licensed. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
