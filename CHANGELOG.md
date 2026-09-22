# Changelog

## Unreleased

- Bound recent transcript text to 200 UTF-16 units in both cores without splitting a Unicode scalar; reject lone surrogates in the retained prefix. Shared parity cases cover an emoji on either side of the boundary.
- Reject malformed room-observation shapes and out-of-vocabulary person, sound, or robot labels in both cores before they can enter model state.
- Omit JSON `null` sensor values consistently in TypeScript and Python room state; extend the shared parity fixture to cover unknown observations.
- Give the TypeScript TypeSafe-wire projection a discriminated, SDK-compatible return type without changing its JSON payload.
- Reject malformed or unknown question kinds consistently in TypeScript and Python; add an offline JSON bank-lint command and reviewer checklist.
- Build the TypeScript distribution during Git dependency installation so a pinned repository commit can be consumed without a sibling checkout.
- Reject duplicate room person IDs in both language cores and non-finite TypeScript decision bands.
- Make default trace exports payload-free metadata in both language cores; full records now require explicit `keepText` / `keep_text` opt-in. This changes the development-preview trace output shape.

## 0.0.1 (development)

- Add typed state, question, client, policy, abstract motion, and trace primitives in TypeScript and Python.
- Add a framework-free browser signal panel, an optional React wrapper, and shared cross-language fixtures.
- Add isolated package-consumer tests and hosted Node, browser, and Python checks.

This is a development release. No live Jev, real-robot compatibility, accuracy, or latency result is claimed.
