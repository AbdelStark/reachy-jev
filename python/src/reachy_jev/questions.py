"""Versioned question banks and the TypeSafe request-wire projection."""

from __future__ import annotations

import re
from typing import Any

_PERSON = re.compile(r"p[1-9]\Z")
_KEY = re.compile(r"[a-z][a-z0-9_]*\Z")
_BANK = re.compile(r"[a-z][a-z0-9_.-]*\Z")
_VERSION = re.compile(r"\d+\.\d+\.\d+\Z")


def _nonempty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def expand_bank(bank: dict[str, Any], person_ids: list[str]) -> dict[str, dict[str, Any]]:
    if (
        not isinstance(bank, dict)
        or not isinstance(bank.get("bank"), str)
        or not _BANK.fullmatch(bank["bank"])
    ):
        raise ValueError("invalid bank name")
    if not isinstance(bank.get("version"), str) or not _VERSION.fullmatch(bank["version"]):
        raise ValueError("invalid bank version")
    questions = bank.get("questions")
    if not isinstance(questions, dict) or not questions:
        raise ValueError("empty question bank")
    if not isinstance(person_ids, list):
        raise ValueError("invalid person IDs")
    ids = list(dict.fromkeys(person_ids))
    if any(not isinstance(person_id, str) or not _PERSON.fullmatch(person_id) for person_id in ids):
        raise ValueError("invalid person ID")
    expanded = {}
    for key, question in questions.items():
        if not isinstance(key, str) or not _KEY.fullmatch(key) or not isinstance(question, dict):
            raise ValueError("invalid question")
        instructions = question.get("instructions")
        if not _nonempty(instructions):
            raise ValueError("invalid question instructions")
        kind = question.get("type")
        if kind == "choice":
            source = question.get("options")
            if set(question) - {"type", "instructions", "options"} or not isinstance(source, list):
                raise ValueError("invalid choice options")
            options = [
                person_id for option in source for person_id in (ids if option == "$people.ids" else [option])
            ]
            if (
                not options
                or any(not _nonempty(option) for option in options)
                or len(set(options)) != len(options)
            ):
                raise ValueError(f"invalid choice options: {key}")
            expanded[key] = {**question, "options": options}
        elif kind == "score":
            levels = question.get("levels")
            if (
                set(question) - {"type", "instructions", "levels"}
                or not isinstance(levels, list)
                or len(levels) < 2
                or any(not _nonempty(level) for level in levels)
                or len(set(levels)) != len(levels)
            ):
                raise ValueError(f"invalid score levels: {key}")
            expanded[key] = dict(question)
        elif kind == "noul":
            if set(question) - {"type", "instructions", "criteria"} or (
                "criteria" in question and not _nonempty(question["criteria"])
            ):
                raise ValueError(f"invalid noul criteria: {key}")
            expanded[key] = dict(question)
        else:
            raise ValueError(f"unknown question type: {key}")
    return expanded


def to_typesafe_questions(bank: dict[str, Any], person_ids: list[str]) -> dict[str, dict[str, Any]]:
    """Keep input text in state data; only fixed bank content becomes instructions."""
    wire = {}
    for key, question in expand_bank(bank, person_ids).items():
        instructions = question["instructions"]
        if question["type"] == "noul" and question.get("criteria"):
            instructions += f" Criteria: {question['criteria']}"
        if question["type"] == "choice":
            wire[key] = {
                "type": "choice",
                "instructions": instructions,
                "criteria": dict.fromkeys(question["options"]),
            }
        elif question["type"] == "score":
            wire[key] = {"type": "score", "instructions": instructions, "criteria": list(question["levels"])}
        else:
            wire[key] = {"type": "noul", "instructions": instructions}
    return wire
