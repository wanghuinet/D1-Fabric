#!/usr/bin/env python3
"""D1-Fabric 3.2 code-development admission gate.

This gate authorizes the next bounded runtime implementation phase only.
It never authorizes production ACTIVE status and never starts runtime code.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
CONFIG = GOV / "config.json"
ARCH = ROOT / "docs" / "D1-FABRIC-3.2-INFRASTRUCTURE-ARCHITECTURE-CONTRACT-v1.0.md"
FINAL = ROOT / "docs" / "D1-FABRIC-3.2-FINAL-ARCHITECTURE-GATE-v1.0.md"
CODEX = ROOT / "docs" / "D1-FABRIC-3.2-CODEX-AUTONOMOUS-DEVELOPMENT-CONTRACT-v1.0.md"


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def require_text(path: Path, markers: list[str]) -> None:
    if not path.is_file():
        fail("CODE_ADMISSION_FILE_MISSING", str(path))
    text = path.read_text(encoding="utf-8")
    missing = [marker for marker in markers if marker not in text]
    if missing:
        fail("CODE_ADMISSION_CONTRACT_MISSING", f"{path}: {missing}")


def main() -> None:
    import json

    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    expected_workers = ["W01", "W02", "W03", "W04", "W05", "W06"]
    if cfg.get("active_worker_topology") != expected_workers:
        fail("CODE_ADMISSION_TOPOLOGY_FAIL", str(cfg.get("active_worker_topology")))
    if cfg.get("worker_addition_requires_adr") is not True:
        fail("CODE_ADMISSION_WORKER_POLICY_FAIL", "worker_addition_requires_adr")
    if cfg.get("worker_addition_requires_change_manifest") is not True:
        fail("CODE_ADMISSION_WORKER_POLICY_FAIL", "worker_addition_requires_change_manifest")
    if cfg.get("target_enforcement_level") != 6:
        fail("CODE_ADMISSION_GOVERNANCE_LEVEL_FAIL", str(cfg.get("target_enforcement_level")))

    require_text(
        ARCH,
        [
            "W01 Gateway",
            "W06 Control Plane",
            "Logical planes are NOT deployment boundaries",
        ],
    )
    require_text(
        FINAL,
        [
            "READY_FOR_NEXT_CODE_PHASE",
            "READY_FOR_NEXT_CODE_PHASE — STOPPED_FOR_USER_COMMAND",
            "READY_FOR_NEXT_CODE_PHASE` ≠ `PASS / ACTIVE",
            "The autonomous governance run MUST stop here",
        ],
    )
    require_text(
        CODEX,
        [
            "READY_FOR_NEXT_CODE_PHASE — STOPPED_FOR_USER_COMMAND",
            "MUST NOT start that next phase during the same autonomous run",
            "six-worker baseline",
        ],
    )

    print(
        "READY_FOR_NEXT_CODE_PHASE — STOPPED_FOR_USER_COMMAND\n"
        "Production ACTIVE remains unauthorized; provider validation, runtime fault injection, "
        "restore/DR, load, security and staged rollout evidence remain production gates."
    )


if __name__ == "__main__":
    main()
