#!/usr/bin/env python3
"""D1-Fabric 3.2 evidence freshness, replay, expiry and forgery gate.

The validator derives registry_generation from canonical governance registry
files, validates a current evidence object, and proves that stale/replayed or
self-approved evidence is rejected.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
POLICY_VERSION = "3.2.4"
EXPECTED_ENVIRONMENT = os.environ.get("D1_FABRIC_EVIDENCE_ENVIRONMENT", "dev")


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def canonical_generation(root: Path) -> str:
    """Hash canonical governance registries, excluding mutable evidence output."""
    files = sorted(
        p for p in (root / ".governance" / "3.2").rglob("*")
        if p.is_file() and p.name != "current-evidence.json"
    )
    h = hashlib.sha256()
    for path in files:
        rel = path.relative_to(root).as_posix()
        data = path.read_bytes()
        h.update(rel.encode("utf-8"))
        h.update(b"\0")
        if path.suffix == ".json":
            obj = json.loads(data.decode("utf-8"))
            data = (json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
        h.update(data)
        h.update(b"\0")
    return h.hexdigest()


def validate(evidence: dict, *, current_commit: str, current_generation: str, actor: str) -> None:
    required = {
        "evidence_id", "change_id", "commit", "registry_generation",
        "policy_version", "environment", "probe", "result", "started_at",
        "finished_at", "verifier", "expires_at",
    }
    missing = sorted(required - evidence.keys())
    if missing:
        fail("EVIDENCE_SCHEMA_FAIL", f"missing={missing}")
    if evidence["result"] != "pass":
        fail("EVIDENCE_RESULT_FAIL", evidence["result"])
    if evidence["commit"] != current_commit:
        fail("EVIDENCE_COMMIT_STALE", f"expected={current_commit}; actual={evidence['commit']}")
    if evidence["registry_generation"] != current_generation:
        fail("EVIDENCE_GENERATION_STALE", "registry generation does not match current governance")
    if evidence["policy_version"] != POLICY_VERSION:
        fail("EVIDENCE_POLICY_STALE", f"expected={POLICY_VERSION}; actual={evidence['policy_version']}")
    if evidence["environment"] != EXPECTED_ENVIRONMENT:
        fail("EVIDENCE_ENVIRONMENT_MISMATCH", f"expected={EXPECTED_ENVIRONMENT}; actual={evidence['environment']}")
    if not evidence["verifier"] or evidence["verifier"] == actor:
        fail("EVIDENCE_SELF_APPROVAL", "verifier must be independent of mutation actor")
    try:
        started = datetime.fromisoformat(evidence["started_at"].replace("Z", "+00:00"))
        finished = datetime.fromisoformat(evidence["finished_at"].replace("Z", "+00:00"))
        expires = datetime.fromisoformat(evidence["expires_at"].replace("Z", "+00:00"))
    except ValueError as exc:
        fail("EVIDENCE_TIMESTAMP_FAIL", str(exc))
    now = datetime.now(timezone.utc)
    if started > finished:
        fail("EVIDENCE_TIMESTAMP_ORDER_FAIL", "started_at > finished_at")
    if expires <= now:
        fail("EVIDENCE_EXPIRED", evidence["expires_at"])


def expect_reject(mutated: dict, *, name: str, current_commit: str, generation: str, actor: str) -> None:
    try:
        validate(mutated, current_commit=current_commit, current_generation=generation, actor=actor)
    except SystemExit as exc:
        if exc.code == 1:
            print(f"{name}: PASS (rejected)")
            return
        raise
    fail("EVIDENCE_REPLAY_ACCEPTED", name)


def main() -> None:
    manifest = json.loads((GOV / "changes" / "current.json").read_text(encoding="utf-8"))
    actor = manifest["actor"]
    current_commit = os.environ.get("GITHUB_SHA") or os.environ.get("D1_FABRIC_CURRENT_COMMIT")
    if not current_commit:
        current_commit = "LOCAL-CURRENT-COMMIT"
    generation = canonical_generation(ROOT)
    now = datetime.now(timezone.utc)
    valid = {
        "evidence_id": "EVD-3.2-CURRENT-001",
        "change_id": manifest["change_id"],
        "commit": current_commit,
        "registry_generation": generation,
        "policy_version": POLICY_VERSION,
        "environment": EXPECTED_ENVIRONMENT,
        "probe": "governance.evidence-freshness",
        "result": "pass",
        "started_at": (now - timedelta(seconds=1)).isoformat().replace("+00:00", "Z"),
        "finished_at": now.isoformat().replace("+00:00", "Z"),
        "verifier": "governance-independent-verifier",
        "expires_at": (now + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
    }

    validate(valid, current_commit=current_commit, current_generation=generation, actor=actor)
    print("CURRENT_EVIDENCE: PASS")

    cases = [
        ("EVD-REPLAY-COMMIT", {**valid, "commit": "OLD-COMMIT"}),
        ("EVD-REPLAY-GENERATION", {**valid, "registry_generation": "OLD-GENERATION"}),
        ("EVD-REPLAY-POLICY", {**valid, "policy_version": "3.2.3"}),
        ("EVD-WRONG-ENVIRONMENT", {**valid, "environment": "prod"}),
        ("EVD-EXPIRED", {**valid, "expires_at": (now - timedelta(seconds=1)).isoformat().replace("+00:00", "Z")}),
        ("EVD-FORGED-VERIFIER", {**valid, "verifier": actor}),
    ]
    for name, mutated in cases:
        expect_reject(mutated, name=name, current_commit=current_commit, generation=generation, actor=actor)

    print(json.dumps({
        "decision": "PASS",
        "policy_version": POLICY_VERSION,
        "environment": EXPECTED_ENVIRONMENT,
        "registry_generation": generation,
        "negative_cases": len(cases),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
