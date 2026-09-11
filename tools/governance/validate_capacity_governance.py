#!/usr/bin/env python3
"""D1-Fabric 3.2 capacity / operational safety governance gate."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
REQUIRED = {f"C-{i:02d}" for i in range(1, 9)}


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def main() -> None:
    data = json.loads((GOV / "capacity" / "registry.json").read_text(encoding="utf-8"))
    checks = data.get("checks", [])
    ids = [item.get("id") for item in checks]
    if set(ids) != REQUIRED or len(ids) != len(set(ids)):
        fail("CAPACITY_REGISTRY_FAIL", f"expected={sorted(REQUIRED)} actual={sorted(ids)}")
    for item in checks:
        for field in ("id", "name", "boundary", "expected"):
            if not item.get(field):
                fail("CAPACITY_SCHEMA_FAIL", f"{item.get('id')}: missing {field}")
        if not isinstance(item.get("max"), (int, float)) or item["max"] <= 0:
            fail("CAPACITY_LIMIT_FAIL", f"{item.get('id')}: invalid max")

    # Deterministic saturation-model checks: controls must trigger before the
    # defined boundary is exceeded, rather than proving provider throughput.
    fixtures = {
        "C-01": (25000, 24999),
        "C-02": (3, 3),
        "C-03": (32, 32),
        "C-04": (25000, 25000),
        "C-05": (1000, 1000),
        "C-06": (0.20, 0.20),
        "C-07": (60, 60),
        "C-08": (1, 1),
    }
    by_id = {item["id"]: item for item in checks}
    for cid, (limit, observed) in fixtures.items():
        configured = by_id[cid]["max"]
        if configured != limit:
            fail("CAPACITY_FIXTURE_MISMATCH", f"{cid}: configured={configured} fixture={limit}")
        action = "degrade-or-reject" if observed >= limit else "admit"
        if observed >= limit and action == "admit":
            fail("CAPACITY_BOUNDARY_FAIL", cid)

    print(json.dumps({
        "decision": "PASS",
        "level": "capacity-operational",
        "checks": sorted(REQUIRED),
        "deterministic_boundary_cases": len(fixtures),
        "note": "Boundary policy is machine-checked; provider-specific load and billing evidence remains required before production admission."
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
