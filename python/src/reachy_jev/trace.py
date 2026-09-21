"""One-line JSON trace export with text removed unless explicitly requested."""

from __future__ import annotations

import json
from typing import Any

_TEXT_KEYS = {
    "text",
    "untrusted_text",
    "transcript_recent",
    "statement",
    "statements",
    "args_summary",
    "user_request",
}


def _strip_text(value: Any) -> Any:
    if isinstance(value, list):
        return [_strip_text(item) for item in value]
    if isinstance(value, dict):
        return {key: _strip_text(item) for key, item in value.items() if key not in _TEXT_KEYS}
    return value


def trace_line(record: dict[str, Any], *, keep_text: bool = False) -> str:
    return (
        json.dumps(record if keep_text else _strip_text(record), ensure_ascii=False, separators=(",", ":"))
        + "\n"
    )
