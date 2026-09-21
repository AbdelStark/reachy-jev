"""Offline example: replace fake_ask with an authenticated host-owned SDK adapter."""

import asyncio
import json

from reachy_jev import JevClient, attend, build_room_state, decide, to_typesafe_questions

BANK = {
    "bank": "example.addressed",
    "version": "0.1.0",
    "questions": {
        "addressed": {
            "type": "noul",
            "instructions": "Is the most recent utterance directed at the robot?",
            "criteria": "True for Reachy by name or a direct question. False for talk between people.",
        }
    },
}


async def fake_ask(_state, _questions):
    return {"model": "fixture-only", "answers": {"addressed": {"type": "noul", "noul": 0.82}}}


async def main():
    state = build_room_state(
        {
            "people": [{"id": "p1", "bearingDeg": -18, "faceHeightFraction": 0.24}],
            "transcriptRecent": [{"who": "p1", "text": "Reachy, are you listening?"}],
        }
    )
    questions = to_typesafe_questions(BANK, ["p1"])
    result = await JevClient(fake_ask).ask(state, questions)
    band = decide(result["answers"]["addressed"]["noul"], no=0.3, yes=0.7)
    target = attend(-18) if band == "yes" and not result["stale"] else attend(0)
    print(json.dumps({"state": state, "questions": questions, "decision": band, "target": target}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
