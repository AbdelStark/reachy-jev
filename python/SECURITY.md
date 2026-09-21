# Security

This package is not an emergency stop, physical safety controller, or sole authorization boundary. The host application and robot firmware must independently enforce limits and stop controls. Treat model output and transcript text as untrusted data. Report vulnerabilities through the repository's private vulnerability reporting feature; do not include API keys or personal recordings.

`trace_line()` defaults to fixed timing/stale metadata, not a redacted copy of arbitrary payload fields. `keep_text=True` exports the entire record, including nested state, answers, actions, and labels; use it only after consent and a separate privacy review. Default timestamps can still reveal activity patterns.
