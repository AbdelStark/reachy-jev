# Question-bank review checklist

`reachy-jev questions lint` checks the JSON structure, version, question kinds, nonempty text, unique options, and dynamic person-ID expansion. It cannot determine whether a model question is well posed. Before changing a bank or making an evaluation claim, review each item below and bump the bank version when wording or options change.

- Ask one literal judgment per question. Split compound conditions into separate questions.
- Avoid double negatives, mental arithmetic, counting, and date comparison. Derive those in code before the call.
- Make criteria agree with the instruction and name at least one clear positive, negative, and boundary case.
- Keep untrusted ASR/OCR text in state data; never interpolate it into `instructions` or `criteria`.
- Include an explicit `none` or equivalent Choice option when no target is a valid outcome, especially with an empty people list.
- Treat returned scores and confidences as model outputs, not calibrated probabilities or safety authority. Gate actions in application code and test on consented data before claiming quality.
