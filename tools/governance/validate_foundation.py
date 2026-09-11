#!/usr/bin/env python3
"""D1-Fabric R1 foundation governance validator. Stdlib-only policy-as-code."""
from __future__ import annotations
import argparse, json, pathlib, re, subprocess, sys, tomllib
from collections import defaultdict, deque
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parents[2]
REG = ROOT / ".d1-fabric" / "registry"
FILES = {
    "capabilities": REG / "capabilities.json", "adrs": REG / "adrs.json",
    "ownership": REG / "ownership.json", "dependencies": REG / "dependencies.json",
    "bindings": REG / "bindings.json", "legacy": REG / "legacy.json",
    "contracts": REG / "contracts.json", "data_ownership": REG / "data-ownership.json",
    "runtime": REG / "runtime-envelope.json", "release": REG / "release-policy.json",
    "exceptions": REG / "exceptions.json",
}
MANIFEST = ROOT / ".d1-fabric" / "change-manifest.json"
ERRORS: list[str] = []

def fail(message: str) -> None: ERRORS.append(message)

def load(path: pathlib.Path):
    try: return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc: fail(f"cannot load {path.relative_to(ROOT)}: {exc}"); return {}

def validate_capabilities() -> set[str]:
    data = load(FILES["capabilities"]); caps = data.get("capabilities", []); ids=[]
    required={"id","name","classification","implementation_mode","owner","module","worker","dependencies","native_substrate","bindings","contracts","status","verification"}
    for cap in caps:
        missing=required-set(cap); aid=cap.get("id","<unknown>")
        if missing: fail(f"capability {aid} missing fields: {sorted(missing)}")
        ids.append(cap.get("id",""))
        if cap.get("implementation_mode")=="REPLACEMENT": fail(f"REPLACEMENT capability requires explicit architecture approval: {aid}")
    if len(ids)!=len(set(ids)): fail("capability registry contains duplicate capability IDs")
    return set(ids)

def validate_adrs() -> set[str]:
    data=load(FILES["adrs"]); pattern=re.compile(data.get("id_pattern",r"ADR-[0-9]{4}")+r"$"); required=set(data.get("required_fields",[])); ids=set()
    for adr in data.get("adrs",[]):
        aid=adr.get("id","")
        if not pattern.fullmatch(aid): fail(f"invalid ADR id: {aid}")
        missing=required-set(adr)
        if missing: fail(f"ADR {aid} missing fields: {sorted(missing)}")
        record=ROOT/adr.get("record_path","")
        if not record.is_file(): fail(f"ADR {aid} record_path does not exist: {adr.get('record_path')}")
        if adr.get("status")=="APPROVED" and not adr.get("decision"): fail(f"approved ADR {aid} has no decision")
        ids.add(aid)
    if len(ids)!=len(data.get("adrs",[])): fail("ADR registry contains duplicate IDs")
    return ids

def validate_dag() -> None:
    data=load(FILES["dependencies"]); nodes=set(data.get("nodes",[])); graph=defaultdict(list); indegree={n:0 for n in nodes}
    for edge in data.get("edges",[]):
        if len(edge)!=2 or edge[0] not in nodes or edge[1] not in nodes: fail(f"invalid dependency edge: {edge}"); continue
        graph[edge[0]].append(edge[1]); indegree[edge[1]]+=1
    q=deque(n for n,d in indegree.items() if d==0); visited=0
    while q:
        n=q.popleft(); visited+=1
        for t in graph[n]: indegree[t]-=1; q.append(t) if indegree[t]==0 else None
    if visited!=len(nodes): fail("dependency DAG contains a cycle")

def validate_ownership() -> None:
    data=load(FILES["ownership"]); workers=data.get("workers",{}); expected={"W01","W02","W03","W04"}
    if set(workers)!=expected: fail(f"active Worker ownership must be exactly {sorted(expected)}; found {sorted(workers)}")
    for worker,item in workers.items():
        prefix=item.get("path_prefix","")
        if not prefix: fail(f"{worker} has no path_prefix")
        elif not (ROOT/prefix).is_dir(): fail(f"ownership path does not exist for {worker}: {prefix}")

def validate_import_rules() -> None:
    data=load(FILES["dependencies"]); rules=data.get("forbidden_import_patterns",[]); root=ROOT/"workers"/"v2"
    for source in root.rglob("*.ts") if root.exists() else []:
        text=source.read_text(encoding="utf-8",errors="replace"); sp=source.relative_to(ROOT).as_posix()
        for rule in rules:
            if sp.startswith(rule["from"]) and rule["forbidden"] in text: fail(f"forbidden dependency/import: {sp} -> {rule['forbidden']}")

def validate_bindings() -> None:
    data=load(FILES["bindings"]); allowed=set(data.get("allowed",{})); root=ROOT/"workers"/"v2"
    for wd in sorted(root.glob("W0[1-6]-*")) if root.exists() else []:
        wrangler=wd/"wrangler.toml"
        if not wrangler.is_file(): continue
        worker=wd.name[:3]
        if worker not in allowed: fail(f"binding policy has no ownership entry for {worker}: {wrangler.relative_to(ROOT)}"); continue
        try: config=tomllib.loads(wrangler.read_text(encoding="utf-8"))
        except Exception as exc: fail(f"invalid wrangler TOML {wrangler.relative_to(ROOT)}: {exc}"); continue
        if worker in data.get("forbidden_workers",[]): fail(f"forbidden Worker has deployable wrangler.toml: {wrangler.relative_to(ROOT)}")
        main=str(config.get("main",""))
        if main and any(main.startswith(p) for p in load(FILES["legacy"]).get("paths",[])): fail(f"legacy path used as Worker entrypoint: {wrangler.relative_to(ROOT)} -> {main}")
        for service in config.get("services",[]):
            binding=str(service.get("binding","")); target=str(service.get("service",""))
            if binding in {"W05","W06"} or "w05" in target.lower() or "w06" in target.lower(): fail(f"forbidden service binding to reserved Worker: {wrangler.relative_to(ROOT)}: {binding} -> {target}")
            if binding not in data["allowed"].get(worker,{}).get("services",[]): fail(f"unauthorized service binding in {wrangler.relative_to(ROOT)}: {binding}")

def validate_legacy() -> None:
    data=load(FILES["legacy"]); paths=data.get("paths",[])
    if not data.get("read_only") or data.get("allow_new_version_import") or data.get("allow_deployment"): fail("legacy policy is not fail-closed")
    # Active code must not textually depend on legacy path names.
    for source in ROOT.rglob("*.ts"):
        sp=source.relative_to(ROOT).as_posix()
        if any(sp.startswith(p) for p in paths): continue
        text=source.read_text(encoding="utf-8",errors="replace")
        for p in paths:
            if p in text: fail(f"active source references legacy path: {sp} -> {p}")

def validate_contracts() -> None:
    data=load(FILES["contracts"]); ids=[]
    for c in data.get("contracts",[]):
        required={"id","type","version","owner","status","providers","compatibility","breaking_change_requires"}-set(c)
        if required: fail(f"contract {c.get('id','<unknown>')} missing fields: {sorted(required)}")
        ids.append(c.get("id"))
        if c.get("compatibility")!="backward-compatible-by-default": fail(f"contract {c.get('id')} is not backward-compatible-by-default")
        if set(c.get("breaking_change_requires",[])) < {"new_version","ADR","verification"}: fail(f"contract {c.get('id')} lacks breaking-change controls")
    if len(ids)!=len(set(ids)): fail("contract registry contains duplicate IDs")

def validate_data_ownership() -> None:
    data=load(FILES["data_ownership"]); ids=[]; owners={"W01","W02","W03","W04"}
    for item in data.get("authoritative_state",[]):
        ids.append(item.get("id"));
        if item.get("owner") not in owners: fail(f"authoritative state has invalid owner: {item.get('id')}")
        if item.get("cache_is_authority") is not False: fail(f"cache cannot be authority: {item.get('id')}")
    if len(ids)!=len(set(ids)): fail("data ownership registry contains duplicate IDs")
    rules=data.get("rules",{})
    if rules.get("single_logical_owner") is not True or rules.get("cross_owner_direct_mutation") is not False or rules.get("unregistered_authoritative_state") is not False: fail("data ownership policy is not fail-closed")

def validate_runtime() -> None:
    data=load(FILES["runtime"]); workers=data.get("workers",{}); expected={"W01","W02","W03","W04"}
    if set(workers)!=expected: fail(f"runtime envelope must cover exactly {sorted(expected)}")
    for w,v in workers.items():
        for k in ("max_fanout","max_retry_attempts"):
            if not isinstance(v.get(k),int) or v[k] < 0: fail(f"invalid runtime envelope {w}.{k}")
    if data.get("defaults",{}).get("bounded_fanout") is not True or data.get("defaults",{}).get("bounded_retries") is not True: fail("runtime envelope is not fail-closed")

def validate_release() -> None:
    data=load(FILES["release"])
    if data.get("supported_contract_policy")!="backward-compatible-by-default": fail("release policy is not backward-compatible-by-default")
    req=data.get("breaking_change",{})
    for k in ("requires_new_version","requires_adr","requires_migration_plan","requires_verification_evidence"):
        if req.get(k) is not True: fail(f"release policy missing breaking-change requirement: {k}")
    if data.get("major_stage_stop") is not True or data.get("next_stage_requires_explicit_user_approval") is not True: fail("release policy does not enforce stage stop/approval")

def validate_exceptions() -> None:
    data=load(FILES["exceptions"]); rules=data.get("rules",{})
    if rules.get("default")!="DENY" or rules.get("permanent_exception") is not False or rules.get("expired_exception_is_valid") is not False: fail("exception policy is not fail-closed")
    for e in data.get("exceptions",[]):
        for k in ("id","rule","reason","owner","scope","expiry","status"):
            if not e.get(k): fail(f"exception missing required field {k}: {e.get('id','<unknown>')}")
        try:
            if date.fromisoformat(e["expiry"]) < date.today(): fail(f"expired exception: {e['id']}")
        except Exception: fail(f"invalid exception expiry: {e.get('id')}")

def git_changed(base,head):
    if not base or not head: return []
    try:
        r=subprocess.run(["git","diff","--name-status",f"{base}...{head}"],cwd=ROOT,text=True,capture_output=True,check=True)
        out=[]
        for line in r.stdout.splitlines():
            f=line.split("\t",2)
            if len(f)>=2: out.append((f[0],f[-1]))
        return out
    except subprocess.CalledProcessError as exc: fail(f"cannot calculate changed files: {exc.stderr.strip()}"); return []

def validate_change_scope(base,head,adr_ids):
    manifest=load(MANIFEST); approved=manifest.get("approved_paths",[]); forbidden=manifest.get("forbidden_paths",[]); changed=git_changed(base,head)
    for status,path in changed:
        if any(path.startswith(p) for p in forbidden): fail(f"changed file is explicitly forbidden by Change Manifest: {path}"); continue
        if not any(path==p or path.startswith(p.rstrip("/")+"/") for p in approved): fail(f"changed file is outside Change Manifest approved_paths: {path}")
    if manifest.get("required_for_architecture_change"):
        architecture_paths=("workers/v2/",".github/workflows/",".d1-fabric/registry/","docs/D1-FABRIC-OPEN-CORE-ARCHITECTURE-CONTRACT","docs/adr/","AGENTS.md")
        if any(p.startswith(architecture_paths) for _,p in changed):
            declared=set(manifest.get("adr_ids",[]));
            if not declared: fail("architecture-scoped change has no adr_ids in Change Manifest")
            unknown=declared-adr_ids
            if unknown: fail(f"Change Manifest references unknown ADRs: {sorted(unknown)}")
    legacy_paths=load(FILES["legacy"]).get("paths",[])
    repair_mode=manifest.get("legacy_repair_mode")
    for status,path in changed:
        if any(path.startswith(p) for p in legacy_paths):
            if not (repair_mode=="DELETE_ONLY" and status=="D" and any(path.startswith(p) for p in manifest.get("legacy_repair_deletion_paths",[]))):
                fail(f"legacy path mutation is forbidden: {path}")

def main():
    p=argparse.ArgumentParser(); p.add_argument("--base"); p.add_argument("--head"); a=p.parse_args()
    capability_ids=validate_capabilities(); adr_ids=validate_adrs(); validate_dag(); validate_ownership(); validate_import_rules(); validate_bindings(); validate_legacy(); validate_contracts(); validate_data_ownership(); validate_runtime(); validate_release(); validate_exceptions(); validate_change_scope(a.base,a.head,adr_ids)
    if ERRORS:
        print("FOUNDATION_GOVERNANCE=FAIL")
        for e in ERRORS: print(f"::error::{e}")
        return 1
    print("FOUNDATION_GOVERNANCE=PASS"); print(f"CAPABILITIES_REGISTERED={len(capability_ids)}"); print(f"ADRS_REGISTERED={len(adr_ids)}"); print("DEPENDENCY_DAG=ACYCLIC"); print("OWNERSHIP=VALID"); print("BINDINGS=VALID"); print("LEGACY_ISOLATION=VALID"); print("CONTRACTS=VALID"); print("DATA_OWNERSHIP=VALID"); print("RUNTIME_ENVELOPE=VALID"); print("RELEASE_POLICY=VALID"); print("EXCEPTIONS=VALID"); print("CHANGE_SCOPE=VALID"); return 0

if __name__=="__main__": raise SystemExit(main())
