"""Inject a TypeSafe adapter; this layer has no SDK or credential dependency."""

from __future__ import annotations

import asyncio
import json
import math
import time
from collections.abc import Awaitable, Callable
from typing import Any


def _transient(error: Exception) -> bool:
    status = getattr(error, "status", None)
    return (
        status in (408, 429)
        or isinstance(status, int)
        and status >= 500
        or any(word in str(error).lower() for word in ("timeout", "network", "fetch failed"))
    )


class JevClient:
    """Cache identical state briefly and return stale previous answers after retry failure.

    The caller must not actuate from a stale result. `ask` should be an async
    authenticated adapter that returns `{answers, model?, usage?}`.
    """

    def __init__(
        self,
        ask: Callable[[Any, Any], Awaitable[dict[str, Any]]],
        *,
        max_age_ms: float = 1000,
        retry_delay_ms: float = 200,
        now: Callable[[], float] | None = None,
        sleep: Callable[[float], Awaitable[None]] | None = None,
        is_transient: Callable[[Exception], bool] | None = None,
    ) -> None:
        if (
            not math.isfinite(max_age_ms)
            or max_age_ms < 0
            or not math.isfinite(retry_delay_ms)
            or retry_delay_ms < 0
        ):
            raise ValueError("invalid timing options")
        self._ask = ask
        self._max_age_ms = max_age_ms
        self._retry_delay_ms = retry_delay_ms
        self._now = now or (lambda: time.monotonic() * 1000)
        self._sleep = sleep or (lambda ms: asyncio.sleep(ms / 1000))
        self._is_transient = is_transient or _transient
        self._previous: tuple[str, dict[str, Any], float] | None = None

    async def ask(self, state: Any, questions: Any) -> dict[str, Any]:
        key = json.dumps([state, questions], sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        start = self._now()
        if self._previous and self._previous[0] == key and 0 <= start - self._previous[2] < self._max_age_ms:
            return {**self._previous[1], "stale": False, "skipped": True, "latencyMs": 0}
        for attempt in range(2):
            try:
                response = await self._ask(state, questions)
                if not isinstance(response, dict) or not isinstance(response.get("answers"), dict):
                    raise TypeError("invalid Jev response")
                self._previous = (key, response, self._now())
                return {**response, "stale": False, "skipped": False, "latencyMs": self._now() - start}
            except Exception as error:
                if not self._is_transient(error):
                    raise
                if attempt == 0:
                    await self._sleep(self._retry_delay_ms)
                elif self._previous:
                    return {
                        **self._previous[1],
                        "stale": True,
                        "skipped": False,
                        "latencyMs": self._now() - start,
                    }
                else:
                    raise
        raise AssertionError("unreachable")

    def clear(self) -> None:
        self._previous = None
