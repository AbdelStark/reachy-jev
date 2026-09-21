# reachy-jev (Python)

Dependency-light decision primitives for Reachy Mini applications. This package converts numeric perception into small Jev-ready text state, expands versioned question banks, applies deterministic policy, and returns abstract pose targets. It does **not** call a model or move a robot by itself.

The TypeScript package and browser panel live in the same [repository](https://github.com/AbdelStark/reachy-jev). This Python distribution is at 0.0.1 and has not been tested on a physical Reachy Mini or against live Jev. Do not use it as a safety controller.

## Install

The core has no runtime dependencies: `pip install reachy-jev`. The optional `jev` extra brings the TypeSafe SDK. Install the Reachy SDK separately in a Python 3.11+ host app; its current Python requirement is stricter than this core's 3.10+ support. Application code owns credentials, network calls, motor limits, and hardware actuation. Until a PyPI release, install the built wheel from this checkout; the command above is the intended published-package form, not a claim that it is live on PyPI.

## Small example

```python
from reachy_jev import attend, build_room_state, decide

state = build_room_state({"people": [{"id": "p1", "bearingDeg": -18, "faceHeightFraction": 0.24}]})
assert state["people"][0]["bearing"] == "slightly left"
band = decide(0.82, no=0.3, yes=0.7)
target = attend(-18) if band == "yes" else attend(0)
# Translate target to Reachy SDK calls in the host, after independent limits.
```

`JevClient` accepts an async `ask(state, questions)` adapter; it caches identical requests for at most one second and retries one transient failure. If it returns `stale=True`, do not actuate from that answer. `to_typesafe_questions()` emits the TypeSafe SDK's request shape; the bank's fixed instructions are never populated from transcript text. `trace_line()` strips transcript and action text by default. All functions are unit-tested without keys or hardware.

Run the complete [offline example](examples/room_decision.py) with `uv run python examples/room_decision.py`. Its fake answer is a fixture, not a Jev result or robot command.

Development: `uv sync --dev`, `uv run ruff check src tests examples`, `uv run ruff format --check src tests examples`, `uv run pytest`, `uv build` from this directory. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
