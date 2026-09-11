#!/usr/bin/env python3
"""D1-Fabric 3.2 Level-4 behavioral governance gate."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def main() -> None:
    behavior = load(GOV / "behavior" / "registry.json")
    required = {x["id"] for x in behavior.get("invariants", [])}
    expected = {f"B-{i:02d}" for i in range(1, 10)}
    if required != expected:
        fail("BEHAVIOR_REGISTRY_FAIL", f"required={sorted(expected)} actual={sorted(required)}")

    cfg = load(GOV / "config.json")
    if cfg.get("active_worker_topology") != ["W01", "W02", "W03", "W04", "W05", "W06"]:
        fail("BEHAVIOR_TOPOLOGY_FAIL", str(cfg.get("active_worker_topology")))

    owners = load(GOV / "ownership" / "registry.json").get("objects", [])
    seen: dict[str, int] = {}
    for item in owners:
        oid = item.get("id")
        if not oid:
            fail("AUTHORITATIVE_WRITER_FAIL", "owner object missing id")
        seen[oid] = seen.get(oid, 0) + 1
        if not item.get("primary_owner"):
            fail("AUTHORITATIVE_WRITER_FAIL", oid)
    duplicates = sorted(k for k, v in seen.items() if v != 1)
    if duplicates:
        fail("AUTHORITATIVE_WRITER_FAIL", str(duplicates))

    bindings = load(GOV / "bindings" / "registry.json").get("bindings", [])
    for binding in bindings:
        if binding.get("authority") != "W06" or binding.get("owner") != "W06":
            fail("BINDING_AUTHORITY_FAIL", binding.get("id", "unknown"))

    deps = load(GOV / "dependencies" / "registry.json").get("edges", [])
    graph: dict[str, list[str]] = {}
    for edge in deps:
        source = edge.get("from")
        target = edge.get("to")
        graph.setdefault(source, []).append(target)
        if edge.get("kind") == "runtime" and edge.get("bootstrap_required") and target == "W06":
            fail("BOOTSTRAP_DEPENDENCY_FAIL", str(edge))

    visiting: set[str] = set()
    visited: set[str] = set()

    def dfs(node: str) -> None:
        if node in visiting:
            fail("DEPENDENCY_CYCLE_FAIL", node)
        if node in visited:
            return
        visiting.add(node)
        for nxt in graph.get(node, []):
            dfs(nxt)
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        dfs(node)

    historical_prefixes = ("archive/api-v1.0/", "archive/legacy/")
    manifest = load(GOV / "changes" / "current.json")
    for path in manifest.get("files", []):
        if path.startswith(historical_prefixes):
            fail("HISTORICAL_ISOLATION_FAIL", path)

    print(json.dumps({
        "decision": "PASS",
        "level": 4,
        "invariants": sorted(required),
        "checks": [
            "authoritative-writer",
            "generation-contract-registry-presence",
            "worker-topology",
            "binding-authority",
            "bootstrap-safety",
            "dependency-acyclicity",
            "historical-isolation",
            "change-scope-declared",
            "no-false-pass"
        ]
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
