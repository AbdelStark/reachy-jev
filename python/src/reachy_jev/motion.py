"""Abstract targets. The host must clamp and actuate through the Reachy SDK."""

from __future__ import annotations

import math
from typing import TypedDict

from .policy import probability


class PoseTarget(TypedDict):
    yawDeg: float
    pitchDeg: float
    rollDeg: float
    zMm: float
    rightAntennaDeg: float
    leftAntennaDeg: float


def _neutral() -> PoseTarget:
    return {"yawDeg": 0, "pitchDeg": 0, "rollDeg": 0, "zMm": 0, "rightAntennaDeg": 0, "leftAntennaDeg": 0}


def attend(bearing_deg: float) -> PoseTarget:
    if not math.isfinite(bearing_deg):
        raise ValueError("bearing must be finite")
    return {**_neutral(), "yawDeg": max(-45, min(45, bearing_deg)), "pitchDeg": -5, "zMm": 3}


def suspicion(p: float) -> PoseTarget:
    probability(p)
    return {
        **_neutral(),
        "yawDeg": 10 * p,
        "rollDeg": 15 * p,
        "zMm": -8 * p,
        "rightAntennaDeg": -35 * p,
        "leftAntennaDeg": -35 * p,
    }


def engaged(level: float) -> PoseTarget:
    if not math.isfinite(level) or not 0 <= level <= 4:
        raise ValueError("engagement level must be in [0,4]")
    return {
        **_neutral(),
        "pitchDeg": -2 * level,
        "zMm": 2.5 * level,
        "rightAntennaDeg": 7.5 * level,
        "leftAntennaDeg": 7.5 * level,
    }


def droop() -> PoseTarget:
    return {**_neutral(), "pitchDeg": 8, "zMm": -6, "rightAntennaDeg": -30, "leftAntennaDeg": -30}


def refuse() -> list[PoseTarget]:
    return [{**_neutral(), "yawDeg": yaw, "rightAntennaDeg": 20} for yaw in (-12, 12, -12, 12, 0)]


def coin_flip() -> list[PoseTarget]:
    return [
        {**_neutral(), "rollDeg": 10 * sign, "rightAntennaDeg": 20 * sign, "leftAntennaDeg": -20 * sign}
        for sign in (1, -1, 1, -1, 0)
    ]
