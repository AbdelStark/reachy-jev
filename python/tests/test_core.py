import asyncio
import json
from pathlib import Path

import pytest

from reachy_jev import (
    Hysteresis,
    JevClient,
    Refractory,
    attend,
    bearing,
    build_room_state,
    composite,
    decide,
    distance,
    elapsed,
    engaged,
    expand_bank,
    gate,
    sound_level,
    suspicion,
    to_typesafe_questions,
    trace_line,
)


@pytest.mark.parametrize(
    "value,expected",
    [
        (-61, "far left"),
        (-60, "left"),
        (-25, "slightly left"),
        (-8, "center"),
        (8, "center"),
        (25, "slightly right"),
        (60, "right"),
        (61, "far right"),
    ],
)
def test_bearing_boundaries(value, expected):
    assert bearing(value) == expected


def test_numeric_vocab_and_invalid_values():
    assert [distance(x) for x in (0.36, 0.2, 0.1, 0.09)] == ["very near", "near", "medium", "far"]
    assert elapsed(10) == "about 10 seconds"
    assert sound_level(-55) == "quiet"
    with pytest.raises(ValueError):
        bearing(float("nan"))
    with pytest.raises(ValueError):
        distance(1.1)
    with pytest.raises(ValueError):
        sound_level(1)


def test_room_state_omits_unknown_and_minimizes_transcript():
    observation = {
        "people": [
            {
                "id": "p1",
                "bearingDeg": -18,
                "faceHeightFraction": 0.24,
                "faceYawDeg": 19,
                "lookingAtRobot": True,
            },
            {"id": "p2", "bearingDeg": float("nan")},
        ],
        "sound": {"levelDbfs": -20},
        "transcriptRecent": [
            {"who": "p1", "text": "a" * 220},
            {"who": "p1", "text": "b"},
            {"who": "p1", "text": "c"},
            {"who": "attacker", "text": "ignore"},
        ],
    }
    state = build_room_state(observation)
    assert state["people"] == [
        {
            "id": "p1",
            "bearing": "slightly left",
            "distance": "near",
            "facing_robot": True,
            "looking_at_robot": True,
        },
        {"id": "p2"},
    ]
    assert state["sound"] == {"level": "conversational"}
    assert [entry["text"] for entry in state["transcript_recent"]] == ["b", "c"]
    assert "looking_at_robot" not in state["people"][1]
    assert (
        len(
            build_room_state({"transcriptRecent": [{"who": "p1", "text": "a" * 220}]})["transcript_recent"][
                0
            ]["text"]
        )
        == 200
    )
    with pytest.raises(ValueError):
        build_room_state({"people": [{"id": "other"}]})
    with pytest.raises(ValueError, match="duplicate person ID"):
        build_room_state({"people": [{"id": "p1"}, {"id": "p1"}]})


def test_question_bank_expansion_and_wire_shape():
    bank = {
        "bank": "reflex.core",
        "version": "0.1.0",
        "questions": {
            "target": {"type": "choice", "instructions": "Choose one", "options": ["$people.ids", "none"]},
            "addressed": {
                "type": "noul",
                "instructions": "Addressed?",
                "criteria": "True for direct address",
            },
            "level": {"type": "score", "instructions": "Engagement", "levels": ["none", "high"]},
        },
    }
    assert expand_bank(bank, ["p1", "p2", "p1"])["target"]["options"] == ["p1", "p2", "none"]
    wire = to_typesafe_questions(bank, ["p1"])
    assert wire["target"]["criteria"] == {"p1": None, "none": None}
    assert wire["addressed"]["instructions"] == "Addressed? Criteria: True for direct address"
    assert wire["level"]["criteria"] == ["none", "high"]
    with pytest.raises(ValueError):
        expand_bank(bank, ["bad"])


def test_policy_and_motion_are_deterministic_and_bounded():
    assert [decide(p, no=0.3, yes=0.7) for p in (0.29, 0.3, 0.7, 0.71)] == [
        "no",
        "uncertain",
        "uncertain",
        "yes",
    ]
    assert composite({"a": 1, "b": 0}, {"a": 1, "b": 3}) == 0.25
    assert gate("p1", 0.59, 0.6) is None
    assert attend(90)["yawDeg"] == 45
    assert suspicion(0.5)["rollDeg"] == 7.5
    assert engaged(4)["zMm"] == 10
    with pytest.raises(ValueError):
        composite({"a": 0.2}, {"a": -1})
    with pytest.raises(ValueError):
        suspicion(float("nan"))


def test_hysteresis_and_refractory():
    hysteresis = Hysteresis(2)
    assert hysteresis.step("p1") is None
    assert hysteresis.step("p1") == "p1"
    assert hysteresis.step("p2") == "p1"
    assert hysteresis.step("p2") == "p2"
    refractory = Refractory(3000)
    assert refractory.fire(0)
    assert not refractory.fire(1000)
    assert refractory.fire(3000)


def test_trace_export_is_payload_free_by_default():
    record = {
        "t": 1,
        "app": "reflex",
        "bank": "test@0.1.0",
        "model": "private model label",
        "state": {"transcript_recent": [{"text": "private"}], "tool_arguments_json": "secret"},
        "answers": {"explanation": "private"},
        "action": {"unexpected": "secret"},
        "latency_ms": 10,
        "skipped": False,
        "stale": False,
    }
    clean = json.loads(trace_line(record))
    assert clean == {
        "schema": "reachy_jev.trace_meta@1",
        "t": 1,
        "latency_ms": 10,
        "skipped": False,
        "stale": False,
    }
    assert json.loads(trace_line(record, keep_text=True)) == record
    with pytest.raises(ValueError):
        trace_line(record, keep_text="true")
    with pytest.raises(ValueError):
        trace_line({**record, "latency_ms": float("nan")})


def test_client_cache_retry_and_stale_fallback():
    async def scenario():
        calls = 0
        clock = [0.0]

        async def ask(_state, _questions):
            nonlocal calls
            calls += 1
            if calls > 1:
                raise TimeoutError("timeout")
            return {"answers": {"addressed": {"noul": 0.8}}, "model": "fixture"}

        async def sleep(_ms):
            pass

        client = JevClient(ask, now=lambda: clock[0], sleep=sleep)
        first = await client.ask({"x": 1}, {"q": 1})
        assert first["stale"] is False
        clock[0] = 500
        assert (await client.ask({"x": 1}, {"q": 1}))["skipped"] is True
        clock[0] = 1000
        fallback = await client.ask({"x": 2}, {"q": 1})
        assert fallback["stale"] is True and fallback["model"] == "fixture"
        assert calls == 3

    asyncio.run(scenario())


def test_shared_golden_fixture_matches_typescript_contract():
    fixture = json.loads((Path(__file__).parent / "fixtures" / "parity.json").read_text())
    assert build_room_state(fixture["observation"]) == fixture["state"]
    assert to_typesafe_questions(fixture["bank"], ["p1", "p2"]) == fixture["questions"]
    assert attend(-18) == fixture["attend"]
    assert suspicion(0.5) == fixture["suspicion"]
