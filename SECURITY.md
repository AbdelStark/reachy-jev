# Security

Do not use this package as an emergency stop, physical safety controller, or sole authorization boundary. Robot firmware and the application must independently enforce motion limits and stop controls. Model output and transcripts are untrusted. Report vulnerabilities through GitHub's private vulnerability reporting feature; do not include API keys or personal recordings.

The default TypeScript and Python trace helpers export only fixed timing/stale metadata. They do not inspect arbitrary payloads for sensitive text because no denylist can make that safe. `keepText: true` / `keep_text=True` emits the complete record, including anything in state, answers, actions, labels, or nested fields. Never enable it for real sessions without consent, a data inventory, and a separate redaction/export review. Default timestamps can still reveal activity patterns.
