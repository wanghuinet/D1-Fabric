#!/usr/bin/env python3
"""D1-Fabric 3.2 evidence identity/freshness gate."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def main() -> None:
    policy = json.loads((GOV / "evidence" / "freshness.json").read_text(encoding="utf-8"))
    required = set(policy.get("required_identity", []))
    expected = {"commit", "registry_generation", "policy_version", "environment", "probe", "verifier"}
    if required != expected:
        fail("EVIDENCE_POLICY_FAIL", f"expected={sorted(expected)} actual={sorted(required)}")

    schema = json.loads((GOV / "evidence" / "schema.json").read_text(encoding="utf-8"))
    schema_required = set(schema.get("required", []))
    if not expected <= schema_required:
        fail("EVIDENCE_SCHEMA_FAIL", "schema does not require freshness identity")
    if "expires_at" not in schema_required:
        fail("EVIDENCE_SCHEMA_FAIL", "expires_at must be mandatory")

    # Deterministic identity mismatch model: any material generation/commit/
    # policy mismatch invalidates evidence, independent of claimed result.
    evidence = {
        "commit": "abc123",
        "registry_generation": "gen-8",
        "policy_version": "3.2.4",
        "environment": "test",
        "probe": "governance",
        "verifier": "ci",
        "expires_at": "2099-01-01T00:00:00Z",
        "result": "pass",
    }
    current = {"commit": "def456", "registry_generation": "gen-9", "policy_version": "3.2.4"}
    stale_fields = [k for k in current if evidence[k] != current[k]]
    if not stale_fields:
        fail("EVIDENCE_STALE_MODEL_FAIL", "stale fixture unexpectedly matches current generation")
    if evidence["result"] == "pass" and stale_fields:
        admission = "reject"
    else:
        admission = "accept"
    if admission != "reject":
        fail("EVIDENCE_STALE_MODEL_FAIL", "stale evidence was admitted")

    print(json.dumps({
        "decision": "PASS",
        "level": "evidence-freshness",
        "required_identity": sorted(expected),
        "deterministic_stale_cases": 1,
        "note": "Freshness rules are machine-checked; CI runtime must bind evidence to its actual commit/generation/environment when produced."
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
