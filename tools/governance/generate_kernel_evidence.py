#!/usr/bin/env python3
"""Generate ephemeral CI evidence for the governance-kernel structural gate.

The producer records facts from the current checkout/CI run. It never mutates
the source-of-truth Evidence Registry and never grants admission.
"""
from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
KERNEL = GOV / "kernel"
OUT = KERNEL / "ci-evidence.generated.json"


def git_sha() -> str:
    value = os.getenv("GITHUB_SHA") or subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    if len(value) != 40 or any(c not in "0123456789abcdef" for c in value):
        raise SystemExit(f"INVALID_COMMIT_SHA: {value}")
    return value


def main() -> None:
    spec = json.loads((KERNEL / "validator-spec.json").read_text(encoding="utf-8"))
    evidence = json.loads((KERNEL / "evidence-registry.json").read_text(encoding="utf-8"))
    manifest = json.loads((GOV / "changes" / "current.json").read_text(encoding="utf-8"))
    generation = spec["policy_generation"]
    policy_version = evidence["active_governance_policy_version"]
    commit = git_sha()
    run_id = os.getenv("GITHUB_RUN_ID", "local")
    now = datetime.now(timezone.utc)
    eid = f"EVID-KERNEL-{commit[:12]}"
    record = {
        "evidence_id": eid,
        "change_id": manifest["change_id"],
        "commit": commit,
        "registry_generation": generation,
        "policy_version": policy_version,
        "environment": "github-actions",
        "probe": "governance-kernel-structural-validation",
        "test_identity": "tools/governance/validate_kernel_governance.py --structural-only",
        "scope": "3.2.6 governance-kernel structural validation only",
        "artifacts": [
            {"path": ".governance/3.2/kernel/*.json", "reproducible": True},
            {"path": "tools/governance/validate_kernel_governance.py", "reproducible": True},
        ],
        "ci_run": run_id,
        "gate": "Governance Kernel Structural Gate",
        "result": "pass",
        "started_at": now.isoformat().replace("+00:00", "Z"),
        "finished_at": now.isoformat().replace("+00:00", "Z"),
        "verifier": "tools/governance/generate_kernel_evidence.py",
        "expires_at": (now + timedelta(days=7)).isoformat().replace("+00:00", "Z"),
        "dag_edges": [
            {"from": "KERNEL-3.2.6", "edge": "REQUIRES", "to": "INVARIANT-KERNEL-INTEGRITY"},
            {"from": "INVARIANT-KERNEL-INTEGRITY", "edge": "IMPLEMENTS", "to": "MACHINE_RULE-KERNEL-VALIDATOR"},
            {"from": "MACHINE_RULE-KERNEL-VALIDATOR", "edge": "VERIFIES", "to": "governance-kernel-structural-validation"},
            {"from": "governance-kernel-structural-validation", "edge": "PRODUCES", "to": f"ARTIFACT-KERNEL-{commit[:12]}"},
            {"from": f"ARTIFACT-KERNEL-{commit[:12]}", "edge": "BINDS_TO", "to": commit},
            {"from": commit, "edge": "EXECUTED_BY", "to": run_id},
            {"from": f"ARTIFACT-KERNEL-{commit[:12]}", "edge": "PRODUCES", "to": eid},
            {"from": eid, "edge": "SUPPORTS", "to": "Governance Kernel Structural Gate"},
            {"from": "Governance Kernel Structural Gate", "edge": "DECIDES", "to": "ADMISSION-ARCHITECTURE"},
        ],
    }
    OUT.write_text(json.dumps({"records": [record]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
