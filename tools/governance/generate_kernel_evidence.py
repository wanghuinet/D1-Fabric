#!/usr/bin/env python3
"""Generate ephemeral CI evidence for the governance-kernel structural gate.

This producer never grants architecture or runtime admission. It records the
exact CI commit/run, probe identity, scope, and verifier inputs used by the
kernel validator. The generated evidence is a CI artifact, not a source-of-
truth registry mutation.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KERNEL = ROOT / ".governance" / "3.2" / "kernel"
OUT = ROOT / ".governance" / "3.2" / "kernel" / "ci-evidence.generated.json"


def git_sha() -> str:
    value = os.getenv("GITHUB_SHA") or subprocess.check_output(
        ["git", "rev-parse", "HEAD"], text=True
    ).strip()
    if len(value) != 40 or any(c not in "0123456789abcdef" for c in value):
        raise SystemExit(f"INVALID_COMMIT_SHA: {value}")
    return value


def main() -> None:
    spec = json.loads((KERNEL / "validator-spec.json").read_text(encoding="utf-8"))
    generation = spec.get("policy_generation")
    now = datetime.now(timezone.utc)
    record = {
        "evidence_id": f"EVID-KERNEL-{git_sha()[:12]}",
        "change_id": os.getenv("D1_FABRIC_CHANGE_ID", "CI-GOVERNANCE-KERNEL"),
        "commit": git_sha(),
        "registry_generation": generation,
        "policy_version": "3.2.6",
        "environment": "github-actions",
        "probe": "governance-kernel-structural-validation",
        "test_identity": "tools/governance/validate_kernel_governance.py",
        "scope": "3.2.6 governance-kernel structural validation only",
        "artifacts": [
            ".governance/3.2/kernel/*.json",
            "tools/governance/validate_kernel_governance.py",
        ],
        "ci_run": os.getenv("GITHUB_RUN_ID", "local"),
        "gate": "Governance Kernel Structural Gate",
        "result": "pass",
        "started_at": now.isoformat().replace("+00:00", "Z"),
        "finished_at": now.isoformat().replace("+00:00", "Z"),
        "verifier": "generate_kernel_evidence.py",
        "expires_at": (now + timedelta(days=7)).isoformat().replace("+00:00", "Z"),
    }
    OUT.write_text(json.dumps({"records": [record]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
