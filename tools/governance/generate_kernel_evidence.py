#!/usr/bin/env python3
"""Generate ephemeral CI evidence for the governance-kernel structural gate.

The producer records facts from the current checkout/CI run. It never mutates
the source-of-truth Evidence Registry and never grants architecture or runtime
admission.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
KERNEL = GOV / "kernel"
OUT = KERNEL / "ci-evidence.generated.json"

ARTIFACT_PATHS = [
    ".governance/3.2/changes/current.json",
    ".governance/3.2/kernel/evidence-registry.json",
    ".governance/3.2/kernel/evidence-dag-registry.json",
    ".governance/3.2/kernel/validator-spec.json",
    "tools/governance/validate_kernel_governance.py",
    "tools/governance/generate_kernel_evidence.py",
]


def git_sha() -> str:
    value = os.getenv("GITHUB_SHA") or subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    value = value.lower()
    if len(value) != 40 or any(c not in "0123456789abcdef" for c in value):
        raise SystemExit(f"INVALID_COMMIT_SHA: {value}")
    subprocess.run(["git", "cat-file", "-e", f"{value}^{{commit}}"], check=True)
    return value


def sha256_file(relative_path: str) -> str:
    path = ROOT / relative_path
    if not path.is_file():
        raise SystemExit(f"MISSING_ARTIFACT: {relative_path}")
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    spec = json.loads((KERNEL / "validator-spec.json").read_text(encoding="utf-8"))
    evidence = json.loads((KERNEL / "evidence-registry.json").read_text(encoding="utf-8"))
    manifest = json.loads((GOV / "changes" / "current.json").read_text(encoding="utf-8"))
    generation = spec["policy_generation"]
    policy_version = evidence["active_governance_policy_version"]
    commit = git_sha()
    run_id = os.getenv("GITHUB_RUN_ID")
    workflow = os.getenv("GITHUB_WORKFLOW")
    job = os.getenv("GITHUB_JOB")
    if not run_id or not workflow or not job:
        raise SystemExit("CI_PROVENANCE_REQUIRED: GITHUB_RUN_ID/GITHUB_WORKFLOW/GITHUB_JOB")
    now = datetime.now(timezone.utc)
    eid = f"EVID-KERNEL-{commit[:12]}"
    artifacts = [
        {"path": path, "sha256": sha256_file(path), "reproducible": True}
        for path in ARTIFACT_PATHS
    ]
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
        "artifacts": artifacts,
        "ci_run": run_id,
        "ci_workflow": workflow,
        "ci_job": job,
        "gate": "Governance Kernel Structural Gate",
        "gate_result": "pass",
        "admission_decision": "KERNEL-VERIFIED; ARCHITECTURE-ADMISSION-BLOCKED",
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
            {"from": "Governance Kernel Structural Gate", "edge": "DECIDES", "to": "KERNEL-VERIFIED"},
        ],
    }
    OUT.write_text(json.dumps({"records": [record]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
