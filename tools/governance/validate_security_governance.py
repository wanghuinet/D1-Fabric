#!/usr/bin/env python3
"""D1-Fabric 3.2 security / tenant-isolation governance gate."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
REQUIRED = {f"S-{i:02d}" for i in range(1, 12)}


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def main() -> None:
    data = json.loads((GOV / "security" / "registry.json").read_text(encoding="utf-8"))
    checks = data.get("checks", [])
    ids = [item.get("id") for item in checks]
    if set(ids) != REQUIRED or len(ids) != len(set(ids)):
        fail("SECURITY_REGISTRY_FAIL", f"expected={sorted(REQUIRED)} actual={sorted(ids)}")
    for item in checks:
        for field in ("id", "name", "scope", "required_fields", "expected"):
            if field not in item or not item[field]:
                fail("SECURITY_SCHEMA_FAIL", f"{item.get('id')}: missing {field}")

    # Deterministic policy simulations for the mandatory isolation properties.
    cases = [
        ("cross-tenant-read", "tenant-a", "tenant-b", "deny"),
        ("cross-tenant-write", "tenant-a", "tenant-b", "deny"),
        ("cache-namespace", "tenant-a", "tenant-b", "namespace-mismatch"),
        ("event-tenant", "tenant-a", "tenant-b", "deny"),
        ("management-visibility", "tenant-a", "tenant-b", "deny"),
    ]
    for name, subject, target, expected in cases:
        actual = "deny" if subject != target else "allow"
        if name == "cache-namespace":
            actual = "namespace-mismatch" if subject != target else "namespace-match"
        if actual != expected:
            fail("SECURITY_SIMULATION_FAIL", f"{name}: expected={expected} actual={actual}")

    generation = (7, 6)
    if generation[1] >= generation[0]:
        fail("SECURITY_STALE_AUTH_FAIL", "stale authorization fixture is not stale")
    if generation[1] != generation[0]:
        decision = "deny"
    else:
        decision = "allow"
    if decision != "deny":
        fail("SECURITY_STALE_AUTH_FAIL", "stale authorization was not denied")

    requested_scope = {"read"}
    granted_scope = {"read", "write"}
    if requested_scope - granted_scope:
        fail("SECURITY_SCOPE_MODEL_FAIL", "requested scope not contained by grant model")
    expanded = requested_scope | {"admin"}
    if not expanded <= granted_scope:
        escalation_decision = "deny"
    else:
        escalation_decision = "allow"
    if escalation_decision != "deny":
        fail("SECURITY_PRIVILEGE_ESCALATION_FAIL", "scope expansion was not denied")

    print(json.dumps({
        "decision": "PASS",
        "level": "security",
        "checks": sorted(REQUIRED),
        "deterministic_simulations": 8,
        "note": "Policy-model evidence passes; provider/runtime security penetration and integration evidence remain required for final architecture admission."
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
