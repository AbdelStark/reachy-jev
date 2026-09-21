"""One-line trace export with payload-free metadata by default."""

from __future__ import annotations

import json
import math
from typing import Any


def trace_line(record: dict[str, Any], *, keep_text: bool = False) -> str:
    if not isinstance(keep_text, bool):
        raise ValueError("keep_text must be a boolean")
    if not isinstance(record, dict):
        raise ValueError("trace record must be an object")
    for key in ("t", "latency_ms"):
        value = record.get(key)
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value < 0
        ):
            raise ValueError("invalid trace metadata")
    if not isinstance(record.get("skipped"), bool) or not isinstance(record.get("stale"), bool):
        raise ValueError("invalid trace metadata")
    if keep_text:
        exported = record
    else:
        exported = {
            "schema": "reachy_jev.trace_meta@1",
            "t": record["t"],
            "latency_ms": record["latency_ms"],
            "skipped": record["skipped"],
            "stale": record["stale"],
        }
    return json.dumps(exported, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n"
