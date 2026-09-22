"""Convert observation numbers to the small vocabulary sent to Jev."""

from __future__ import annotations

import math
import re
from typing import Any

_PERSON = re.compile(r"p[1-9]\Z")


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _optional_bool(value: Any, field: str) -> bool | None:
    if value is None:
        return None
    if not isinstance(value, bool):
        raise ValueError(f"{field} must be boolean")
    return value


def _optional_choice(value: Any, choices: tuple[str, ...], field: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or value not in choices:
        raise ValueError(f"invalid {field}")
    return value


def _bounded_transcript(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError("transcript text must be string")
    chars: list[str] = []
    units = 0
    for char in value:
        code_point = ord(char)
        if 0xD800 <= code_point <= 0xDFFF:
            raise ValueError("invalid transcript Unicode")
        width = 2 if code_point > 0xFFFF else 1
        if units + width > 200:
            break
        chars.append(char)
        units += width
    return "".join(chars)


def bearing(degrees: float) -> str:
    if not _finite(degrees):
        raise ValueError("bearing must be finite")
    if degrees < -60:
        return "far left"
    if degrees < -25:
        return "left"
    if degrees < -8:
        return "slightly left"
    if degrees <= 8:
        return "center"
    if degrees <= 25:
        return "slightly right"
    if degrees <= 60:
        return "right"
    return "far right"


def distance(fraction: float) -> str:
    if not _finite(fraction) or not 0 <= fraction <= 1:
        raise ValueError("face height fraction must be in [0,1]")
    return (
        "very near"
        if fraction > 0.35
        else "near"
        if fraction >= 0.20
        else "medium"
        if fraction >= 0.10
        else "far"
    )


def elapsed(seconds: float) -> str:
    if not _finite(seconds) or seconds < 0:
        raise ValueError("elapsed seconds must be non-negative")
    if seconds < 2:
        return "just now"
    if seconds < 10:
        return "a few seconds"
    if seconds < 20:
        return "about 10 seconds"
    if seconds < 45:
        return "about half a minute"
    if seconds < 90:
        return "about a minute"
    return "over a minute"


def sound_level(dbfs: float) -> str:
    if not _finite(dbfs) or dbfs > 0:
        raise ValueError("dBFS must be finite and <= 0")
    return "silent" if dbfs < -55 else "quiet" if dbfs < -35 else "conversational" if dbfs < -15 else "loud"


def build_room_state(observation: dict[str, Any]) -> dict[str, Any]:
    """Accept the same camelCase observation shape as the TypeScript package.

    Missing or non-finite sensor fields are omitted, never inferred. Caller-supplied
    person IDs must be session-local p1..p9 identifiers.
    """
    if not isinstance(observation, dict):
        raise ValueError("invalid room observation shape")
    for field, kind in (("people", list), ("sound", dict), ("robot", dict), ("transcriptRecent", list)):
        value = observation.get(field)
        if value is not None and not isinstance(value, kind):
            raise ValueError("invalid room observation shape")
    people: list[dict[str, Any]] = []
    person_ids: set[str] = set()
    for item in observation.get("people") or []:
        if not isinstance(item, dict):
            raise ValueError("invalid person observation")
        person_id = item.get("id")
        if not isinstance(person_id, str) or not _PERSON.fullmatch(person_id):
            raise ValueError("person IDs must be session-local p1..p9 identifiers")
        if person_id in person_ids:
            raise ValueError("duplicate person ID")
        person_ids.add(person_id)
        never_spoke = _optional_bool(item.get("neverSpoke"), "person.neverSpoke")
        if never_spoke and item.get("secondsSinceLastSpoke") is not None:
            raise ValueError("neverSpoke conflicts with secondsSinceLastSpoke")
        person: dict[str, Any] = {"id": person_id}
        for source, output, convert in (
            ("bearingDeg", "bearing", bearing),
            ("faceHeightFraction", "distance", distance),
            ("secondsSinceLastSpoke", "seconds_since_last_spoke", elapsed),
        ):
            if _finite(item.get(source)):
                person[output] = convert(item[source])
        if _finite(item.get("faceYawDeg")):
            person["facing_robot"] = abs(item["faceYawDeg"]) < 20
        for source, output in (("lookingAtRobot", "looking_at_robot"), ("speaking", "speaking")):
            value = _optional_bool(item.get(source), f"person.{source}")
            if value is not None:
                person[output] = value
        moving = _optional_choice(item.get("moving"), ("still", "shifting", "walking"), "person.moving")
        if moving is not None:
            person["moving"] = moving
        if never_spoke:
            person["seconds_since_last_spoke"] = "never"
        people.append(person)

    state: dict[str, Any] = {"schema": "room_state@1", "people": people}
    sound = observation.get("sound") or {}
    sound_state: dict[str, Any] = {}
    if _finite(sound.get("loudestBearingDeg")):
        sound_state["loudest_bearing"] = bearing(sound["loudestBearingDeg"])
    if _finite(sound.get("levelDbfs")):
        sound_state["level"] = sound_level(sound["levelDbfs"])
    voice_detected = _optional_bool(sound.get("voiceDetected"), "sound.voiceDetected")
    if voice_detected is not None:
        sound_state["voice_detected"] = voice_detected
    if sound_state:
        state["sound"] = sound_state

    counts: dict[str, int] = {}
    recent: list[dict[str, Any]] = []
    for utterance in reversed(observation.get("transcriptRecent") or []):
        if not isinstance(utterance, dict):
            raise ValueError("invalid transcript observation")
        who = utterance.get("who")
        if who != "unknown" and (not isinstance(who, str) or not _PERSON.fullmatch(who)):
            continue
        if counts.get(who, 0) >= 2:
            continue
        counts[who] = counts.get(who, 0) + 1
        entry: dict[str, Any] = {"who": who, "text": _bounded_transcript(utterance["text"])}
        if _finite(utterance.get("endedSecondsAgo")):
            entry["ended"] = elapsed(utterance["endedSecondsAgo"])
        recent.append(entry)
        if len(recent) == 4:
            break
    if recent:
        state["transcript_recent"] = list(reversed(recent))

    robot = observation.get("robot") or {}
    robot_state: dict[str, Any] = {}
    currently_speaking = _optional_bool(robot.get("currentlySpeaking"), "robot.currentlySpeaking")
    if currently_speaking is not None:
        robot_state["currently_speaking"] = currently_speaking
    looking_at = robot.get("lookingAt")
    if looking_at is not None:
        if not isinstance(looking_at, str) or (looking_at != "none" and not _PERSON.fullmatch(looking_at)):
            raise ValueError("invalid robot.lookingAt")
        robot_state["looking_at"] = looking_at
    posture = _optional_choice(
        robot.get("posture"), ("idle", "attending", "nodding", "drooping"), "robot.posture"
    )
    if posture is not None:
        robot_state["posture"] = posture
    if _finite(robot.get("secondsSinceOwnLastTurn")):
        robot_state["seconds_since_own_last_turn"] = elapsed(robot["secondsSinceOwnLastTurn"])
    if robot_state:
        state["robot"] = robot_state
    return state
