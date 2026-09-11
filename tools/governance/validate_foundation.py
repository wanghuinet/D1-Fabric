#!/usr/bin/env python3
"""D1-Fabric R1 foundation governance validator. Stdlib-only policy-as-code."""
from __future__ import annotations
import argparse, json, pathlib, re, subprocess, tomllib
from collections import defaultdict, deque
from datetime import date
ROOT=pathlib.Path(__file__).resolve().parents[2]
REG=ROOT/".d1-fabric"/"registry"
FILES={"capabilities":REG/"capabilities.json","adrs":REG/"adrs.json","ownership":REG/"ownership.json","dependencies":REG/"dependencies.json","bindings":REG/"bindings.json","legacy":REG/"legacy.json","contracts":REG/"contracts.json","data_ownership":REG/"data-ownership.json","runtime":REG/"runtime-envelope.json","release":REG/"release-policy.json","exceptions":REG/"exceptions.json"}
MANIFEST=ROOT/".d1-fabric"/"change-manifest.json"
ERRORS=[]
def fail(message): ERRORS.append(message)
def load(path):
    try:return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:fail(f"cannot load {path.relative_to(ROOT)}: {exc}");return {}
def validate_capabilities():
    d=load(FILES["capabilities"]);ids=[];required={"id","name","classification","implementation_mode","owner","module","worker","dependencies","native_substrate","bindings","contracts","status","verification"}
    for c in d.get("capabilities",[]):
        if required-set(c):fail(f"capability {c.get('id','<unknown>')} missing fields: {sorted(required-set(c))}")
        ids.append(c.get("id",""))
        if c.get("implementation_mode")=="REPLACEMENT":fail(f"REPLACEMENT capability requires explicit architecture approval: {c.get('id')}")
    if len(ids)!=len(set(ids)):fail("capability registry contains duplicate capability IDs")
    return set(ids)
def validate_adrs():
    d=load(FILES["adrs"]);pat=re.compile(d.get("id_pattern",r"ADR-[0-9]{4}")+r"$");req=set(d.get("required_fields",[]));ids=set()
    for a in d.get("adrs",[]):
        aid=a.get("id","")
        if not pat.fullmatch(aid):fail(f"invalid ADR id: {aid}")
        if req-set(a):fail(f"ADR {aid} missing fields: {sorted(req-set(a))}")
        if not (ROOT/a.get("record_path","")).is_file():fail(f"ADR {aid} record_path does not exist: {a.get('record_path')}")
        if a.get("status")=="APPROVED" and not a.get("decision"):fail(f"approved ADR {aid} has no decision")
        ids.add(aid)
    if len(ids)!=len(d.get("adrs",[])):fail("ADR registry contains duplicate IDs")
    return ids
def validate_dag():
    d=load(FILES["dependencies"]);nodes=set(d.get("nodes",[]));g=defaultdict(list);ind={n:0 for n in nodes}
    for e in d.get("edges",[]):
        if len(e)!=2 or e[0] not in nodes or e[1] not in nodes:fail(f"invalid dependency edge: {e}");continue
        g[e[0]].append(e[1]);ind[e[1]]+=1
    q=deque(n for n,v in ind.items() if v==0);seen=0
    while q:
        n=q.popleft();seen+=1
        for t in g[n]:
            ind[t]-=1
            if ind[t]==0:q.append(t)
    if seen!=len(nodes):fail("dependency DAG contains a cycle")
def validate_ownership():
    d=load(FILES["ownership"]);w=d.get("workers",{});expected={"W01","W02","W03","W04"}
    if set(w)!=expected:fail(f"active Worker ownership must be exactly {sorted(expected)}; found {sorted(w)}")
    for k,v in w.items():
        p=v.get("path_prefix","")
        if not p:fail(f"{k} has no path_prefix")
        elif not(ROOT/p).is_dir():fail(f"ownership path does not exist for {k}: {p}")
def validate_import_rules():
    d=load(FILES["dependencies"]);root=ROOT/"workers"/"v2"
    for f in root.rglob("*.ts") if root.exists() else []:
        sp=f.relative_to(ROOT).as_posix();txt=f.read_text(encoding="utf-8",errors="replace")
        for r in d.get("forbidden_import_patterns",[]):
            if sp.startswith(r["from"]) and r["forbidden"] in txt:fail(f"forbidden dependency/import: {sp} -> {r['forbidden']}")
def validate_bindings():
    d=load(FILES["bindings"]);root=ROOT/"workers"/"v2";legacy=load(FILES["legacy"]).get("paths",[])
    for wd in sorted(root.glob("W0[1-6]-*")) if root.exists() else []:
        w=wd.name[:3];f=wd/"wrangler.toml"
        if not f.is_file():continue
        if w not in d.get("allowed",{}):fail(f"binding policy has no ownership entry for {w}: {f.relative_to(ROOT)}");continue
        try:c=tomllib.loads(f.read_text(encoding="utf-8"))
        except Exception as exc:fail(f"invalid wrangler TOML {f.relative_to(ROOT)}: {exc}");continue
        if w in d.get("forbidden_workers",[]):fail(f"forbidden Worker has deployable wrangler.toml: {f.relative_to(ROOT)}")
        main=str(c.get("main",""))
        if any(main.startswith(p) for p in legacy):fail(f"legacy path used as Worker entrypoint: {f.relative_to(ROOT)} -> {main}")
        for s in c.get("services",[]):
            b=str(s.get("binding",""));t=str(s.get("service",""))
            if b in {"W05","W06"} or "w05" in t.lower() or "w06" in t.lower():fail(f"forbidden service binding to reserved Worker: {f.relative_to(ROOT)}: {b} -> {t}")
            if b not in d["allowed"].get(w,{}).get("services",[]):fail(f"unauthorized service binding in {f.relative_to(ROOT)}: {b}")
def validate_legacy():
    d=load(FILES["legacy"]);paths=d.get("paths",[])
    if d.get("read_only") is not True or d.get("allow_new_version_import") is not False or d.get("allow_deployment") is not False:fail("legacy policy is not fail-closed")
    for f in ROOT.rglob("*.ts"):
        sp=f.relative_to(ROOT).as_posix()
        if any(sp.startswith(p) for p in paths):continue
        txt=f.read_text(encoding="utf-8",errors="replace")
        for p in paths:
            if p in txt:fail(f"active source references legacy path: {sp} -> {p}")
def validate_contracts():
    d=load(FILES["contracts"]);ids=[]
    for c in d.get("contracts",[]):
        req={"id","type","version","owner","status","providers","compatibility","breaking_change_requires"}-set(c)
        if req:fail(f"contract {c.get('id','<unknown>')} missing fields: {sorted(req)}")
        ids.append(c.get("id"))
        if c.get("compatibility")!="backward-compatible-by-default":fail(f"contract {c.get('id')} is not backward-compatible-by-default")
        if not {"new_version","ADR","verification"}.issubset(set(c.get("breaking_change_requires",[]))):fail(f"contract {c.get('id')} lacks breaking-change controls")
    if len(ids)!=len(set(ids)):fail("contract registry contains duplicate IDs")
def validate_data_ownership():
    d=load(FILES["data_ownership"]);ids=[];owners={"W01","W02","W03","W04"}
    for x in d.get("authoritative_state",[]):
        ids.append(x.get("id"))
        if x.get("owner") not in owners:fail(f"authoritative state has invalid owner: {x.get('id')}")
        if x.get("cache_is_authority") is not False:fail(f"cache cannot be authority: {x.get('id')}")
    if len(ids)!=len(set(ids)):fail("data ownership registry contains duplicate IDs")
    r=d.get("rules",{})
    if r.get("single_logical_owner") is not True or r.get("cross_owner_direct_mutation") is not False or r.get("unregistered_authoritative_state") is not False:fail("data ownership policy is not fail-closed")
def validate_runtime():
    d=load(FILES["runtime"]);w=d.get("workers",{});expected={"W01","W02","W03","W04"}
    if set(w)!=expected:fail(f"runtime envelope must cover exactly {sorted(expected)}")
    for k,v in w.items():
        for f in ("max_fanout","max_retry_attempts"):
            if not isinstance(v.get(f),int) or v[f]<0:fail(f"invalid runtime envelope {k}.{f}")
    if d.get("defaults",{}).get("bounded_fanout") is not True or d.get("defaults",{}).get("bounded_retries") is not True:fail("runtime envelope is not fail-closed")
def validate_release():
    d=load(FILES["release"]);r=d.get("breaking_change",{})
    if d.get("supported_contract_policy")!="backward-compatible-by-default":fail("release policy is not backward-compatible-by-default")
    for k in ("requires_new_version","requires_adr","requires_migration_plan","requires_verification_evidence"):
        if r.get(k) is not True:fail(f"release policy missing breaking-change requirement: {k}")
    if d.get("major_stage_stop") is not True or d.get("next_stage_requires_explicit_user_approval") is not True:fail("release policy does not enforce stage stop/approval")
def validate_exceptions():
    d=load(FILES["exceptions"]);r=d.get("rules",{})
    if r.get("default")!="DENY" or r.get("permanent_exception") is not False or r.get("expired_exception_is_valid") is not False:fail("exception policy is not fail-closed")
    for e in d.get("exceptions",[]):
        for k in ("id","rule","reason","owner","scope","expiry","status"):
            if not e.get(k):fail(f"exception missing required field {k}: {e.get('id','<unknown>')}")
        try:
            if date.fromisoformat(e["expiry"])<date.today():fail(f"expired exception: {e['id']}")
        except Exception:fail(f"invalid exception expiry: {e.get('id')}")
def git_changed(base,head):
    if not base or not head:return []
    try:
        r=subprocess.run(["git","diff","--name-status",f"{base}...{head}"],cwd=ROOT,text=True,capture_output=True,check=True);out=[]
        for line in r.stdout.splitlines():
            x=line.split("\t",2)
            if len(x)>=2:out.append((x[0],x[-1]))
        return out
    except subprocess.CalledProcessError as exc:fail(f"cannot calculate changed files: {exc.stderr.strip()}");return []
def validate_change_scope(base,head,adr_ids):
    m=load(MANIFEST);approved=m.get("approved_paths",[]);forbidden=m.get("forbidden_paths",[]);changed=git_changed(base,head)
    repair_paths=m.get("repair_deletion_paths",[])
    for status,path in changed:
        repair=status=="D" and any(path.startswith(p) for p in repair_paths)
        if any(path.startswith(p) for p in forbidden) and not repair:fail(f"changed file is explicitly forbidden by Change Manifest: {path}");continue
        if not repair and not any(path==p or path.startswith(p.rstrip("/")+"/") for p in approved):fail(f"changed file is outside Change Manifest approved_paths: {path}")
    if m.get("required_for_architecture_change"):
        ap=("workers/v2/",".github/workflows/",".d1-fabric/registry/","docs/D1-FABRIC-OPEN-CORE-ARCHITECTURE-CONTRACT","docs/adr/","AGENTS.md")
        if any(p.startswith(ap) for _,p in changed):
            declared=set(m.get("adr_ids",[]))
            if not declared:fail("architecture-scoped change has no adr_ids in Change Manifest")
            unknown=declared-adr_ids
            if unknown:fail(f"Change Manifest references unknown ADRs: {sorted(unknown)}")
    legacy_paths=load(FILES["legacy"]).get("paths",[]);mode=m.get("legacy_repair_mode")
    for status,path in changed:
        if any(path.startswith(p) for p in legacy_paths) and not(mode=="DELETE_ONLY" and status=="D" and any(path.startswith(p) for p in m.get("legacy_repair_deletion_paths",[]))):fail(f"legacy path mutation is forbidden: {path}")
def main():
    p=argparse.ArgumentParser();p.add_argument("--base");p.add_argument("--head");a=p.parse_args()
    ids=validate_capabilities();adrs=validate_adrs();validate_dag();validate_ownership();validate_import_rules();validate_bindings();validate_legacy();validate_contracts();validate_data_ownership();validate_runtime();validate_release();validate_exceptions();validate_change_scope(a.base,a.head,adrs)
    if ERRORS:
        print("FOUNDATION_GOVERNANCE=FAIL")
        for e in ERRORS:print(f"::error::{e}")
        return 1
    print("FOUNDATION_GOVERNANCE=PASS");print(f"CAPABILITIES_REGISTERED={len(ids)}");print(f"ADRS_REGISTERED={len(adrs)}");print("DEPENDENCY_DAG=ACYCLIC");print("OWNERSHIP=VALID");print("BINDINGS=VALID");print("LEGACY_ISOLATION=VALID");print("CONTRACTS=VALID");print("DATA_OWNERSHIP=VALID");print("RUNTIME_ENVELOPE=VALID");print("RELEASE_POLICY=VALID");print("EXCEPTIONS=VALID");print("CHANGE_SCOPE=VALID");return 0
if __name__=="__main__":raise SystemExit(main())
