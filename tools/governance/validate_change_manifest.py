#!/usr/bin/env python3
"""D1-Fabric 3.2 machine governance: Change Manifest + Diff Scope Gate."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
MANIFEST = GOV / "changes" / "current.json"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def git_changed(base: str) -> list[str]:
    if not base or set(base) == {"0"}:
        try:
            base = subprocess.check_output(["git", "rev-parse", "HEAD^"], text=True).strip()
        except subprocess.CalledProcessError:
            return []
    out = subprocess.check_output(["git", "diff", "--name-only", base, "HEAD"], text=True)
    return sorted(x for x in out.splitlines() if x)


def main() -> None:
    manifest = load(MANIFEST)
    required = [
        "change_id", "actor", "target_environment", "risk", "owners",
        "capabilities", "resources", "files", "policy_version",
        "verification_plan", "recovery_class", "expiry", "adr_refs",
    ]
    for key in required:
        if key not in manifest:
            fail("CHANGE_MANIFEST_INVALID", f"missing {key}")

    files = sorted(set(manifest["files"]))
    if not files:
        fail("CHANGE_MANIFEST_INVALID", "files must not be empty")
    for path in files:
        if path.startswith("/") or ".." in Path(path).parts:
            fail("CHANGE_MANIFEST_INVALID", f"unsafe path: {path}")

    base = os.environ.get("D1_FABRIC_BASE_SHA", "")
    changed = git_changed(base)
    declared = sorted(files)
    if changed != declared:
        missing = sorted(set(changed) - set(declared))
        extra = sorted(set(declared) - set(changed))
        fail("DIFF_SCOPE_FAIL", f"undeclared={missing}; declared_not_changed={extra}")

    # Historical material is immutable reference-only. These are the exact
    # repository prefixes currently classified as historical in 3.2.
    historical = ("archive/api-v1.0/", "archive/legacy/")
    touched_historical = [p for p in changed if p.startswith(historical)]
    if touched_historical:
        fail("HISTORICAL_ISOLATION_FAIL", str(touched_historical))

    adrs = load(GOV / "adrs" / "registry.json").get("adrs", [])
    by_id = {}
    for adr in adrs:
        aid = adr.get("id")
        if not aid or aid in by_id:
            fail("ADR_REGISTRY_FAIL", f"duplicate_or_missing_id={aid}")
        if adr.get("status") not in {"accepted", "superseded"}:
            fail("ADR_REGISTRY_FAIL", f"unresolved_status={aid}")
        by_id[aid] = adr
        if adr.get("conflicts_with"):
            fail("ADR_CONFLICT_FAIL", f"{aid} conflicts_with={adr['conflicts_with']}")
    for aid in manifest["adr_refs"]:
        if aid not in by_id:
            fail("ADR_REFERENCE_FAIL", f"unresolved={aid}")

    caps = load(GOV / "capabilities" / "registry.json").get("capabilities", [])
    owners = load(GOV / "ownership" / "registry.json").get("objects", [])
    bindings = load(GOV / "bindings" / "registry.json").get("bindings", [])
    owner_ids = {x.get("id") for x in owners}
    binding_ids = {x.get("id") for x in bindings}
    for cap in caps:
        if cap.get("owner") not in owner_ids:
            fail("OWNERSHIP_REFERENCE_FAIL", f"{cap.get('id')} -> {cap.get('owner')}")
        for ref in cap.get("binding_refs", []):
            if ref not in binding_ids:
                fail("BINDING_REFERENCE_FAIL", f"{cap.get('id')} -> {ref}")
    for b in bindings:
        if b.get("authority") != "W06" or b.get("owner") != "W06":
            fail("BINDING_AUTHORITY_FAIL", str(b.get("id")))

    deps = load(GOV / "dependencies" / "registry.json").get("edges", [])
    graph: dict[str, list[str]] = {}
    for edge in deps:
        graph.setdefault(edge["from"], []).append(edge["to"])
        if edge.get("bootstrap_required") and edge.get("kind") == "runtime" and edge.get("to") == "W06":
            fail("BOOTSTRAP_DEPENDENCY_FAIL", str(edge))
    visiting, visited = set(), set()
    def dfs(node: str):
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

    cfg = load(GOV / "config.json")
    expected = ["W01", "W02", "W03", "W04", "W05", "W06"]
    if cfg.get("active_worker_topology") != expected:
        fail("WORKER_TOPOLOGY_DRIFT", str(cfg.get("active_worker_topology")))
    if cfg.get("worker_addition_requires_adr") is not True:
        fail("WORKER_ADMISSION_POLICY_MISSING", "worker_addition_requires_adr")
    if cfg.get("worker_addition_requires_change_manifest") is not True:
        fail("WORKER_ADMISSION_POLICY_MISSING", "worker_addition_requires_change_manifest")

    print(json.dumps({
        "decision": "PASS",
        "change_id": manifest["change_id"],
        "changed_files": changed,
        "adr_refs": manifest["adr_refs"],
        "gates": ["diff-scope", "historical-isolation", "adr", "ownership", "binding", "dependency-dag", "worker-admission"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
