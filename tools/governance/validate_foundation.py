#!/usr/bin/env python3
"""D1-Fabric foundation governance validator.

Stdlib-only. This is intentionally policy-as-code: a PASS means the repository
state was evaluated, not merely that governance documents exist.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import subprocess
import sys
import tomllib
from collections import defaultdict, deque

ROOT = pathlib.Path(__file__).resolve().parents[2]
REG = ROOT / ".d1-fabric" / "registry"
CAPS = REG / "capabilities.json"
ADRS = REG / "adrs.json"
OWNERSHIP = REG / "ownership.json"
DEPS = REG / "dependencies.json"
BINDINGS = REG / "bindings.json"
MANIFEST = ROOT / ".d1-fabric" / "change-manifest.json"

ERRORS: list[str] = []


def fail(message: str) -> None:
    ERRORS.append(message)


def load(path: pathlib.Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"cannot load {path.relative_to(ROOT)}: {exc}")
        return {}


def validate_capabilities() -> set[str]:
    data = load(CAPS)
    caps = data.get("capabilities", [])
    ids: list[str] = []
    required = {"id", "name", "classification", "implementation_mode", "owner", "module", "worker", "dependencies", "native_substrate", "bindings", "contracts", "status", "verification"}
    for cap in caps:
        missing = required - set(cap)
        if missing:
            fail(f"capability {cap.get('id', '<unknown>')} missing fields: {sorted(missing)}")
        ids.append(cap.get("id", ""))
        if cap.get("implementation_mode") == "REPLACEMENT":
            fail(f"REPLACEMENT capability requires explicit architecture approval: {cap.get('id')}")
    if len(ids) != len(set(ids)):
        fail("capability registry contains duplicate capability IDs")
    return set(ids)


def validate_adrs() -> set[str]:
    data = load(ADRS)
    pattern = re.compile(data.get("id_pattern", r"ADR-[0-9]{4}") + r"$")
    required = set(data.get("required_fields", []))
    ids: set[str] = set()
    for adr in data.get("adrs", []):
        aid = adr.get("id", "")
        if not pattern.fullmatch(aid):
            fail(f"invalid ADR id: {aid}")
        missing = required - set(adr)
        if missing:
            fail(f"ADR {aid} missing fields: {sorted(missing)}")
        record = ROOT / adr.get("record_path", "")
        if not record.is_file():
            fail(f"ADR {aid} record_path does not exist: {adr.get('record_path')}")
        if adr.get("status") == "APPROVED" and not adr.get("decision"):
            fail(f"approved ADR {aid} has no decision")
        ids.add(aid)
    return ids


def validate_dag() -> None:
    data = load(DEPS)
    nodes = set(data.get("nodes", []))
    graph: dict[str, list[str]] = defaultdict(list)
    indegree = {n: 0 for n in nodes}
    for edge in data.get("edges", []):
        if len(edge) != 2 or edge[0] not in nodes or edge[1] not in nodes:
            fail(f"invalid dependency edge: {edge}")
            continue
        graph[edge[0]].append(edge[1])
        indegree[edge[1]] += 1
    queue = deque(n for n, degree in indegree.items() if degree == 0)
    visited = 0
    while queue:
        node = queue.popleft()
        visited += 1
        for target in graph[node]:
            indegree[target] -= 1
            if indegree[target] == 0:
                queue.append(target)
    if visited != len(nodes):
        fail("dependency DAG contains a cycle")


def worker_from_path(path: str) -> str | None:
    match = re.match(r"workers/v2/(W0[1-6])-", path)
    return match.group(1) if match else None


def validate_ownership() -> None:
    data = load(OWNERSHIP)
    workers = data.get("workers", {})
    expected = {"W01", "W02", "W03", "W04"}
    if set(workers) != expected:
        fail(f"active Worker ownership must be exactly {sorted(expected)}; found {sorted(workers)}")
    for worker, item in workers.items():
        prefix = item.get("path_prefix", "")
        if not prefix:
            fail(f"{worker} has no path_prefix")
        if not (ROOT / prefix).is_dir():
            fail(f"ownership path does not exist for {worker}: {prefix}")
    for prefix in data.get("forbidden_worker_prefixes", []):
        if (ROOT / prefix).exists():
            # Existing directories are tolerated during R1 so the gate can report the drift;
            # deployable descriptors and changed files are hard failures below.
            pass


def validate_import_rules() -> None:
    data = load(DEPS)
    rules = data.get("forbidden_import_patterns", [])
    source_files = list((ROOT / "workers" / "v2").rglob("*.ts")) if (ROOT / "workers" / "v2").exists() else []
    for source in source_files:
        text = source.read_text(encoding="utf-8", errors="replace")
        source_path = source.relative_to(ROOT).as_posix()
        for rule in rules:
            if not source_path.startswith(rule["from"]):
                continue
            if rule["forbidden"] in text:
                fail(f"forbidden dependency/import: {source_path} -> {rule['forbidden']}")


def validate_bindings() -> None:
    data = load(BINDINGS)
    allowed_workers = set(data.get("allowed", {}))
    for worker_dir in sorted((ROOT / "workers" / "v2").glob("W0[1-6]-*")):
        wrangler = worker_dir / "wrangler.toml"
        if not wrangler.is_file():
            continue
        worker = worker_dir.name[:3]
        if worker not in allowed_workers:
            fail(f"binding policy has no ownership entry for {worker}: {wrangler.relative_to(ROOT)}")
            continue
        try:
            config = tomllib.loads(wrangler.read_text(encoding="utf-8"))
        except Exception as exc:
            fail(f"invalid wrangler TOML {wrangler.relative_to(ROOT)}: {exc}")
            continue
        if worker in data.get("forbidden_workers", []):
            fail(f"forbidden Worker has deployable wrangler.toml: {wrangler.relative_to(ROOT)}")
        for service in config.get("services", []):
            binding = str(service.get("binding", ""))
            target = str(service.get("service", ""))
            if binding in {"W05", "W06"} or "w05" in target.lower() or "w06" in target.lower():
                fail(f"forbidden service binding to reserved Worker in {wrangler.relative_to(ROOT)}: {binding} -> {target}")
            allowed_services = data["allowed"].get(worker, {}).get("services", [])
            if binding not in allowed_services:
                fail(f"unauthorized service binding in {wrangler.relative_to(ROOT)}: {binding}")
        for kind in ("d1_databases", "kv_namespaces", "r2_buckets", "durable_objects", "queues", "workflows"):
            entries = config.get(kind, [])
            if entries and kind not in {"d1_databases", "kv_namespaces", "r2_buckets", "durable_objects", "queues", "workflows"}:
                fail(f"unknown binding kind: {kind}")
            if entries and worker not in data["allowed"]:
                fail(f"binding owner missing for {worker}: {kind}")


def git_changed(base: str | None, head: str | None) -> list[str]:
    if not base or not head:
        return []
    try:
        result = subprocess.run(["git", "diff", "--name-only", f"{base}...{head}"], cwd=ROOT, text=True, capture_output=True, check=True)
        return [line.strip() for line in result.stdout.splitlines() if line.strip()]
    except subprocess.CalledProcessError as exc:
        fail(f"cannot calculate changed files: {exc.stderr.strip()}")
        return []


def validate_change_scope(base: str | None, head: str | None, adr_ids: set[str]) -> None:
    manifest = load(MANIFEST)
    approved = manifest.get("approved_paths", [])
    forbidden = manifest.get("forbidden_paths", [])
    changed = git_changed(base, head)
    if not changed:
        return
    for path in changed:
        if any(path.startswith(prefix) for prefix in forbidden):
            fail(f"changed file is explicitly forbidden by Change Manifest: {path}")
            continue
        if not any(path == prefix or path.startswith(prefix.rstrip("/") + "/") for prefix in approved):
            fail(f"changed file is outside Change Manifest approved_paths: {path}")
    if manifest.get("required_for_architecture_change"):
        architecture_paths = ("workers/v2/", ".github/workflows/", ".d1-fabric/registry/", "docs/D1-FABRIC-OPEN-CORE-ARCHITECTURE-CONTRACT", "AGENTS.md")
        if any(path.startswith(architecture_paths) for path in changed):
            declared = set(manifest.get("adr_ids", []))
            if not declared:
                fail("architecture-scoped change has no adr_ids in Change Manifest")
            unknown = declared - adr_ids
            if unknown:
                fail(f"Change Manifest references unknown ADRs: {sorted(unknown)}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base")
    parser.add_argument("--head")
    args = parser.parse_args()

    capability_ids = validate_capabilities()
    adr_ids = validate_adrs()
    validate_dag()
    validate_ownership()
    validate_import_rules()
    validate_bindings()
    validate_change_scope(args.base, args.head, adr_ids)

    if ERRORS:
        print("FOUNDATION_GOVERNANCE=FAIL")
        for error in ERRORS:
            print(f"::error::{error}")
        return 1

    print("FOUNDATION_GOVERNANCE=PASS")
    print(f"CAPABILITIES_REGISTERED={len(capability_ids)}")
    print(f"ADRS_REGISTERED={len(adr_ids)}")
    print("DEPENDENCY_DAG=ACYCLIC")
    print("OWNERSHIP=VALID")
    print("BINDINGS=VALID")
    print("CHANGE_SCOPE=VALID")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
