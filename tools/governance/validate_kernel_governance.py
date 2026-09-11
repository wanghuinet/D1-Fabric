#!/usr/bin/env python3
"""D1-Fabric 3.2.6 Governance Kernel validator.

Structural validation and evidence validation are separate modes. An empty
source Evidence Registry is never architecture PASS. CI evidence is bound to
the current checkout, trusted CI identity, Change Manifest, exact artifacts,
and the Evidence DAG. This validator never grants runtime admission.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / ".governance" / "3.2"
KERNEL = GOV / "kernel"
FILES = (
    "contract-metadata.schema.json", "authority-record.schema.json", "contract-registry.json",
    "authority-registry.json", "lifecycle-registry.json", "evidence-dag-registry.json",
    "evidence-registry.json", "capacity-cost-provider-registry.json", "registry-integrity-rules.json",
    "validator-spec.json",
)
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
HEX64_RE = re.compile(r"^[0-9a-f]{64}$")


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def load(name: str):
    path = KERNEL / name
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail("V-001", f"missing {name}")
    except json.JSONDecodeError as exc:
        fail("V-001", f"invalid JSON {name}: {exc}")


def parse_time(value: object, field: str, evidence_id: str) -> datetime:
    if not isinstance(value, str) or not value:
        fail("V-007", f"{evidence_id}: {field} must be an ISO-8601 string")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        fail("V-007", f"{evidence_id}: invalid {field}")
    if parsed.tzinfo is None:
        fail("V-007", f"{evidence_id}: {field} must include timezone")
    return parsed.astimezone(timezone.utc)


def validate_structure(docs: dict, spec: dict) -> None:
    declared = set(spec.get("inputs", []))
    missing = declared - set(docs)
    if missing:
        fail("V-001", f"undeclared/unavailable inputs: {sorted(missing)}")
    generation = spec.get("policy_generation")
    for name, doc in docs.items():
        if "policy_generation" in doc and doc["policy_generation"] != generation:
            fail("V-002", f"{name}: {doc.get('policy_generation')} != {generation}")
    contracts = docs["contract-registry.json"].get("records", [])
    active = [x for x in contracts if x.get("status") == "ACTIVE"]
    identities = [(x.get("contract_id"), x.get("version")) for x in active]
    if any(not cid or not ver for cid, ver in identities) or len(identities) != len(set(identities)):
        fail("V-003", "active contract identity missing or duplicated")
    authorities = docs["authority-registry.json"].get("records", [])
    object_ids = [x.get("object_id") for x in authorities]
    if any(not x for x in object_ids) or len(object_ids) != len(set(object_ids)):
        fail("V-004", "authority object_id missing or duplicated")
    required = {"object_type", "object_id", "authority_owner", "authoritative_store", "authoritative_writer",
                "version_field", "generation_or_epoch", "mutation_policy", "read_replicas", "cache_policy",
                "stale_reader_policy", "conflict_policy", "bootstrap_source", "recovery_source", "audit_source"}
    for record in authorities:
        missing_fields = sorted(required - record.keys())
        if missing_fields:
            fail("V-005", f"{record.get('object_id')}: {missing_fields}")
    lifecycle = docs["lifecycle-registry.json"]
    states = set(lifecycle.get("states", []))
    for transition in lifecycle.get("forward_transitions", []):
        if len(transition) != 2 or transition[0] not in states or transition[1] not in states:
            fail("V-006", str(transition))
    if lifecycle.get("current_project_state") not in states:
        fail("V-006", "current_project_state is not declared")
    dag = docs["evidence-dag-registry.json"]
    nodes = set(dag.get("node_types", []))
    required_nodes = {"CONTRACT", "INVARIANT", "MACHINE_RULE", "TEST_OR_PROBE", "ARTIFACT", "COMMIT", "CI_RUN", "EVIDENCE", "GATE", "ADMISSION_DECISION"}
    if not required_nodes.issubset(nodes):
        fail("V-007", f"missing DAG node types: {sorted(required_nodes - nodes)}")
    if dag.get("terminal_integrity", {}).get("evidence_record_required_before_architecture_pass") is not True:
        fail("V-007", "architecture evidence requirement is not fail-closed")
    capacity = docs["capacity-cost-provider-registry.json"]
    for record in capacity.get("records", []):
        if not record.get("hard_limits") or not record.get("saturation_threshold") or not record.get("degradation_policy"):
            fail("V-008", f"incomplete capacity record: {record.get('resource', 'unknown')}")
    historical = ("archive/api-v1.0/", "archive/legacy/", "old/", "legacy/")
    for record in contracts:
        if record.get("status") == "ACTIVE" and str(record.get("source", "")).startswith(historical):
            fail("V-009", str(record.get("source")))
    expected_runtime_policy = "validator PASS does not itself authorize runtime code; Final Architecture Gate and Code Development Admission remain authoritative"
    if spec.get("runtime_policy") != expected_runtime_policy:
        fail("V-010", "runtime admission boundary missing")


def sha256_file(relative_path: str) -> str:
    path = ROOT / relative_path
    if not path.is_file():
        fail("V-007", f"missing evidence artifact: {relative_path}")
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def current_commit() -> str:
    value = (os.getenv("GITHUB_SHA") or subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()).lower()
    if not SHA_RE.fullmatch(value):
        fail("V-007", f"current checkout SHA invalid: {value}")
    subprocess.run(["git", "cat-file", "-e", f"{value}^{{commit}}"], check=True)
    return value


def validate_dag(record: dict, expected_commit: str, expected_run: str) -> None:
    eid = record["evidence_id"]
    edges = record.get("dag_edges")
    if not isinstance(edges, list) or len(edges) != 9:
        fail("V-007", f"{eid}: DAG must contain exactly 9 terminal-chain edges")
    commit = record["commit"]
    run_id = record["ci_run"]
    artifact_node = f"ARTIFACT-KERNEL-{commit[:12]}"
    expected = [
        ("KERNEL-3.2.6", "REQUIRES", "INVARIANT-KERNEL-INTEGRITY"),
        ("INVARIANT-KERNEL-INTEGRITY", "IMPLEMENTS", "MACHINE_RULE-KERNEL-VALIDATOR"),
        ("MACHINE_RULE-KERNEL-VALIDATOR", "VERIFIES", "governance-kernel-structural-validation"),
        ("governance-kernel-structural-validation", "PRODUCES", artifact_node),
        (artifact_node, "BINDS_TO", commit),
        (commit, "EXECUTED_BY", run_id),
        (artifact_node, "PRODUCES", eid),
        (eid, "SUPPORTS", "Governance Kernel Structural Gate"),
        ("Governance Kernel Structural Gate", "DECIDES", "KERNEL-VERIFIED"),
    ]
    actual = [(x.get("from"), x.get("edge"), x.get("to")) for x in edges if isinstance(x, dict)]
    if actual != expected:
        fail("V-007", f"{eid}: DAG terminal chain mismatch")
    if commit != expected_commit or run_id != expected_run:
        fail("V-007", f"{eid}: DAG provenance does not match current CI")


def validate_evidence(records: object, evidence_doc: dict, generation: object, spec: dict) -> None:
    if not isinstance(records, list) or not records:
        print("V-007: NOT_PASS: no current evidence records exist")
        raise SystemExit(2)
    required = set(evidence_doc.get("required_record_fields", []))
    expected_policy_version = evidence_doc.get("active_governance_policy_version")
    manifest_path = GOV / "changes" / "current.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        fail("V-007", f"invalid current Change Manifest: {exc}")
    expected_commit = current_commit()
    expected_run = os.getenv("GITHUB_RUN_ID")
    expected_workflow = os.getenv("GITHUB_WORKFLOW")
    expected_job = os.getenv("GITHUB_JOB")
    expected_event = os.getenv("GITHUB_EVENT_NAME")
    expected_ref = os.getenv("GITHUB_REF")
    trusted_ci = spec.get("trusted_ci", {})
    if not expected_run or not expected_workflow or not expected_job or not expected_event or not expected_ref:
        fail("V-007", "CI provenance requires run/workflow/job/event/ref identity")
    if expected_workflow != trusted_ci.get("workflow_name") or expected_job != trusted_ci.get("job_id") or expected_event not in trusted_ci.get("allowed_events", []):
        fail("V-007", "CI identity is not the declared trusted governance workflow/job")
    trusted_verifiers = set(spec.get("trusted_verifiers", []))
    seen: set[str] = set()
    for record in records:
        if not isinstance(record, dict):
            fail("V-007", "evidence record must be an object")
        evidence_id = str(record.get("evidence_id", "unknown"))
        missing = sorted(required - record.keys())
        if missing:
            fail("V-007", f"{evidence_id}: missing evidence fields {missing}")
        if evidence_id in seen:
            fail("V-007", f"duplicate evidence_id: {evidence_id}")
        seen.add(evidence_id)
        if record.get("result") != "pass":
            fail("V-007", f"{evidence_id}: result is not pass")
        if record.get("change_id") != manifest.get("change_id"):
            fail("V-007", f"{evidence_id}: change_id is not the current Change Manifest")
        if record.get("commit") != expected_commit or not SHA_RE.fullmatch(str(record.get("commit", ""))):
            fail("V-007", f"{evidence_id}: commit is not the current verified checkout")
        if record.get("ci_run") != expected_run or record.get("ci_workflow") != expected_workflow or record.get("ci_job") != expected_job:
            fail("V-007", f"{evidence_id}: CI provenance mismatch")
        if record.get("ci_event") != expected_event or record.get("ci_ref") != expected_ref:
            fail("V-007", f"{evidence_id}: CI event/ref provenance mismatch")
        if record.get("ci_workflow") != trusted_ci.get("workflow_name") or record.get("ci_job") != trusted_ci.get("job_id"):
            fail("V-007", f"{evidence_id}: trusted CI identity mismatch")
        if record.get("verifier") not in trusted_verifiers:
            fail("V-007", f"{evidence_id}: verifier is not allowlisted")
        if record.get("registry_generation") != generation:
            fail("V-007", f"{evidence_id}: registry_generation mismatch")
        if record.get("policy_version") != expected_policy_version:
            fail("V-007", f"{evidence_id}: policy_version mismatch")
        if record.get("gate") != "Governance Kernel Structural Gate" or record.get("gate_result") != "pass":
            fail("V-007", f"{evidence_id}: gate authenticity mismatch")
        if record.get("admission_decision") != "KERNEL-VERIFIED; ARCHITECTURE-ADMISSION-BLOCKED":
            fail("V-007", f"{evidence_id}: invalid admission decision")
        for field in ("environment", "probe", "test_identity", "scope", "verifier"):
            if not isinstance(record.get(field), str) or not record[field]:
                fail("V-007", f"{evidence_id}: {field} is empty")
        started = parse_time(record.get("started_at"), "started_at", evidence_id)
        finished = parse_time(record.get("finished_at"), "finished_at", evidence_id)
        expires = parse_time(record.get("expires_at"), "expires_at", evidence_id)
        now = datetime.now(timezone.utc)
        if finished < started or expires <= finished or expires <= now:
            fail("V-007", f"{evidence_id}: invalid or expired evidence time window")
        artifacts = record.get("artifacts")
        if not isinstance(artifacts, list) or not artifacts:
            fail("V-007", f"{evidence_id}: artifacts must be non-empty")
        allowed_artifacts = set(manifest.get("evidence_artifacts", [])) | set(manifest.get("files", []))
        for artifact in artifacts:
            if not isinstance(artifact, dict) or not isinstance(artifact.get("path"), str) or not HEX64_RE.fullmatch(str(artifact.get("sha256", ""))):
                fail("V-007", f"{evidence_id}: artifact requires path and sha256")
            path = artifact["path"]
            if path not in allowed_artifacts:
                fail("V-007", f"{evidence_id}: artifact outside declared evidence scope: {path}")
            if artifact.get("reproducible") is not True or sha256_file(path) != artifact["sha256"]:
                fail("V-007", f"{evidence_id}: artifact hash/provenance mismatch: {path}")
        validate_dag(record, expected_commit, expected_run)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-file", help="ephemeral CI evidence JSON to validate")
    parser.add_argument("--structural-only", action="store_true", help="validate kernel structure without requiring evidence records")
    args = parser.parse_args()
    docs = {name: load(name) for name in FILES}
    spec = docs["validator-spec.json"]
    validate_structure(docs, spec)
    if args.structural_only:
        print(json.dumps({"decision": "PASS", "mode": "STRUCTURAL_ONLY", "validator_id": spec.get("validator_id"), "policy_generation": spec.get("policy_generation"), "runtime_admission": "BLOCKED_UNTIL_FINAL_ARCHITECTURE_GATE_AND_CODE_DEVELOPMENT_ADMISSION"}, indent=2))
        return
    evidence_doc = docs["evidence-registry.json"]
    if args.evidence_file:
        try:
            payload = json.loads(Path(args.evidence_file).read_text(encoding="utf-8"))
        except (FileNotFoundError, json.JSONDecodeError) as exc:
            fail("V-007", f"invalid evidence file: {exc}")
        validate_evidence(payload.get("records"), evidence_doc, spec.get("policy_generation"), spec)
    else:
        validate_evidence(evidence_doc.get("records"), evidence_doc, spec.get("policy_generation"), spec)
    print(json.dumps({"decision": "PASS", "mode": "EVIDENCE_VALIDATED", "validator_id": spec.get("validator_id"), "policy_generation": spec.get("policy_generation"), "runtime_admission": "BLOCKED_UNTIL_FINAL_ARCHITECTURE_GATE_AND_CODE_DEVELOPMENT_ADMISSION"}, indent=2))


if __name__ == "__main__":
    main()
