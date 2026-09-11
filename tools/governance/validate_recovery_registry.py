#!/usr/bin/env python3
"""D1-Fabric 3.2 recovery-governance structural gate."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REG = ROOT / ".governance" / "3.2" / "recovery" / "registry.json"

REQUIRED = {
    "R-01", "R-02", "R-03", "R-04", "R-05",
    "R-06", "R-07", "R-08", "R-09", "R-10"
}

def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)

def main() -> None:
    data = json.loads(REG.read_text(encoding="utf-8"))
    scenarios = data.get("scenarios", [])
    ids = [x.get("id") for x in scenarios]
    if len(ids) != len(set(ids)):
        fail("RECOVERY_REGISTRY_FAIL", "duplicate scenario id")
    if set(ids) != REQUIRED:
        fail("RECOVERY_COVERAGE_FAIL", f"expected={sorted(REQUIRED)} actual={sorted(ids)}")
    for scenario in scenarios:
        for field in ("id", "name", "failure_domain", "expected"):
            if not scenario.get(field):
                fail("RECOVERY_SCHEMA_FAIL", f"{scenario.get('id')}: missing {field}")
    print(json.dumps({
        "decision": "PASS",
        "level": 5,
        "scenarios": sorted(ids),
        "note": "Structural recovery coverage is proven; runtime fault-injection execution remains a required architecture-admission evidence class."
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
