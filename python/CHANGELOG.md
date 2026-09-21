# Changelog

## Unreleased

- Reject duplicate room person IDs.
- Export only payload-free timing/stale metadata by default; full trace records require explicit `keep_text=True`. This changes the development-preview trace output shape.

## 0.0.1 (development)

- Add dependency-light typed state, question, client, policy, abstract motion, and trace primitives.
- Add shared cross-language parity fixtures, offline example, Python 3.10–3.13 CI, and isolated wheel-consumer verification.

The source is public; no PyPI distribution or live robot/TypeSafe result is claimed.
