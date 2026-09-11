#!/usr/bin/env python3
"""D1-Fabric 3.2 mutation-based adversarial governance gate.

Every case starts from a clean copy of the governance fixture, applies one
forbidden mutation, and requires the corresponding machine gate to reject it.
A mutation that is silently accepted is itself a governance failure.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
TOOLS = ROOT / "tools" / "governance"


def run_gate(root: Path, tool: str) -> tuple[int, str]:
    proc = subprocess.run(
        [sys.executable, str(root / "tools" / "governance" / tool)],
        cwd=root,
        text=True,
        capture_output=True,
    )
    return proc.returncode, (proc.stdout + proc.stderr).strip()


def fixture() -> Path:
    tmp = Path(tempfile.mkdtemp(prefix="d1fabric-governance-adversarial-"))
    (tmp / ".governance").mkdir(parents=True)
    shutil.copytree(GOV, tmp / ".governance" / "3.2")
    (tmp / "tools" / "governance").mkdir(parents=True)
    for name in ("validate_behavioral_governance.py", "validate_recovery_registry.py"):
        shutil.copy2(TOOLS / name, tmp / "tools" / "governance" / name)
    return tmp


def load(root: Path, rel: str) -> dict:
    return json.loads((root / rel).read_text(encoding="utf-8"))


def save(root: Path, rel: str, data: dict) -> None:
    (root / rel).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def case_delete_owner(root: Path) -> None:
    data = load(root, ".governance/3.2/ownership/registry.json")
    data["objects"] = [x for x in data["objects"] if x["id"] != "W04"]
    save(root, ".governance/3.2/ownership/registry.json", data)


def case_duplicate_owner(root: Path) -> None:
    data = load(root, ".governance/3.2/ownership/registry.json")
    data["objects"].append(dict(data["objects"][0]))
    save(root, ".governance/3.2/ownership/registry.json", data)


def case_binding_escalation(root: Path) -> None:
    data = load(root, ".governance/3.2/bindings/registry.json")
    data["bindings"][0]["authority"] = "W04"
    save(root, ".governance/3.2/bindings/registry.json", data)


def case_dependency_cycle(root: Path) -> None:
    data = load(root, ".governance/3.2/dependencies/registry.json")
    data["edges"].append({"from": "W06", "to": "W01", "kind": "runtime", "bootstrap_required": False})
    data["edges"].append({"from": "W01", "to": "W06", "kind": "runtime", "bootstrap_required": False})
    save(root, ".governance/3.2/dependencies/registry.json", data)


def case_bootstrap_dependency(root: Path) -> None:
    data = load(root, ".governance/3.2/dependencies/registry.json")
    data["edges"].append({"from": "W01", "to": "W06", "kind": "runtime", "bootstrap_required": True})
    save(root, ".governance/3.2/dependencies/registry.json", data)


def case_historical_manifest(root: Path) -> None:
    data = load(root, ".governance/3.2/changes/current.json")
    data["files"] = ["archive/legacy/forbidden-change.md"]
    save(root, ".governance/3.2/changes/current.json", data)


def case_topology_add_worker(root: Path) -> None:
    data = load(root, ".governance/3.2/config.json")
    data["active_worker_topology"].append("W07")
    save(root, ".governance/3.2/config.json", data)


def case_behavior_registry_missing(root: Path) -> None:
    data = load(root, ".governance/3.2/behavior/registry.json")
    data["invariants"] = [x for x in data["invariants"] if x["id"] != "B-09"]
    save(root, ".governance/3.2/behavior/registry.json", data)


def case_recovery_missing(root: Path) -> None:
    data = load(root, ".governance/3.2/recovery/registry.json")
    data["scenarios"] = [x for x in data["scenarios"] if x["id"] != "R-10"]
    save(root, ".governance/3.2/recovery/registry.json", data)


CASES = [
    ("GOV-001", "delete authoritative owner", case_delete_owner, "validate_behavioral_governance.py"),
    ("GOV-002", "duplicate primary owner", case_duplicate_owner, "validate_behavioral_governance.py"),
    ("GOV-007", "binding privilege escalation", case_binding_escalation, "validate_behavioral_governance.py"),
    ("GOV-005", "dependency cycle", case_dependency_cycle, "validate_behavioral_governance.py"),
    ("GOV-006", "bootstrap dependency violation", case_bootstrap_dependency, "validate_behavioral_governance.py"),
    ("GOV-011", "historical material activation", case_historical_manifest, "validate_behavioral_governance.py"),
    ("GOV-009", "unauthorized worker admission", case_topology_add_worker, "validate_behavioral_governance.py"),
    ("GOV-019", "remove required behavioral invariant", case_behavior_registry_missing, "validate_behavioral_governance.py"),
    ("GOV-018", "remove required recovery scenario", case_recovery_missing, "validate_recovery_registry.py"),
]


def main() -> None:
    results = []
    for case_id, description, mutate, gate in CASES:
        root = fixture()
        try:
            mutate(root)
            code, output = run_gate(root, gate)
            accepted = code == 0
            results.append({"id": case_id, "description": description, "decision": "FAIL" if accepted else "PASS"})
            if accepted:
                print(f"ADVERSARIAL_ACCEPTED_MUTATION: {case_id}: {description}\n{output}")
                raise SystemExit(1)
        finally:
            shutil.rmtree(root, ignore_errors=True)

    print(json.dumps({
        "decision": "PASS",
        "gate": "adversarial-mutation",
        "cases": results,
        "statement": "Every implemented forbidden mutation was rejected by its machine governance gate."
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
