"""Deterministic policy primitives; no model or robot calls."""

from __future__ import annotations

import math
from typing import TypeVar

T = TypeVar("T")


def probability(value: float) -> float:
    if (
        isinstance(value, bool)
        or not isinstance(value, (float, int))
        or not math.isfinite(value)
        or not 0 <= value <= 1
    ):
        raise ValueError("probability must be in [0,1]")
    return value


def decide(value: float, *, no: float, yes: float) -> str:
    if not 0 <= no < yes <= 1:
        raise ValueError("invalid band")
    probability(value)
    return "no" if value < no else "yes" if value > yes else "uncertain"


class Hysteresis:
    def __init__(self, ticks: int) -> None:
        if isinstance(ticks, bool) or not isinstance(ticks, int) or ticks < 1:
            raise ValueError("ticks must be a positive integer")
        self.ticks = ticks
        self.reset()

    def step(self, value: T) -> T | None:
        if value == self._candidate:
            self._count += 1
        else:
            self._candidate = value
            self._count = 1
        if self._count >= self.ticks:
            self._current = value
        return self._current

    def reset(self) -> None:
        self._candidate = None
        self._current = None
        self._count = 0


class Refractory:
    def __init__(self, window_ms: float) -> None:
        if (
            not isinstance(window_ms, (int, float))
            or isinstance(window_ms, bool)
            or not math.isfinite(window_ms)
            or window_ms < 0
        ):
            raise ValueError("window_ms must be non-negative")
        self.window_ms = window_ms
        self._last = -math.inf

    def fire(self, now_ms: float) -> bool:
        if (
            not isinstance(now_ms, (int, float))
            or isinstance(now_ms, bool)
            or not math.isfinite(now_ms)
            or now_ms < self._last
            or now_ms - self._last < self.window_ms
        ):
            return False
        self._last = now_ms
        return True


def composite(values: dict[str, float], weights: dict[str, float]) -> float:
    if not weights:
        raise ValueError("weights required")
    total = 0.0
    weighted = 0.0
    for key, weight in weights.items():
        if (
            not isinstance(weight, (int, float))
            or isinstance(weight, bool)
            or not math.isfinite(weight)
            or weight < 0
        ):
            raise ValueError("invalid weight")
        if key not in values:
            raise KeyError(f"missing value: {key}")
        total += weight
        weighted += probability(values[key]) * weight
    if total <= 0:
        raise ValueError("positive total weight required")
    return max(0.0, min(1.0, weighted / total))


def gate(choice: T, confidence: float, min_confidence: float) -> T | None:
    probability(min_confidence)
    return choice if probability(confidence) >= min_confidence else None
