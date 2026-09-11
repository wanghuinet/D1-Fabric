#!/usr/bin/env python3
"""D1-Fabric 3.2.6 Governance Kernel validator.

Structural validation and evidence validation are separate modes. An empty
source Evidence Registry is never architecture PASS. CI may validate an
explicit ephemeral evidence file produced by a trusted probe in the same run.
This validator never grants runtime admission.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KERNEL = ROOT / ".governance" / "3.2" / "kernel"
FILES = (
    "contract-metadata.schema.json", "authority-record.schema.json", "contract-registry.json",
    "authority-registry.json", "lifecycle-registry.json", "evidence-dag-registry.json",
    "evidence-registry.json", "capacity-cost-provider-registry.json", "registry-integrity-rules.json",
    "validator-spec.json",
)
SHA_RE = re.compile(r"^[0-9a-f]{40}$")


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
    if any(not cid or not ver for cid, ver in identities):
        fail("V-003", "active contract missing contract_id/version")
    if len(identities) != len(set(identities)):
        fail("V-003", "duplicate active contract identity")
    authorities = docs["authority-registry.json"].get("records", [])
    object_ids = [x.get("object_id") for x in authorities]
    if any(not x for x in object_ids):
        fail("V-005", "authority record missing object_id")
    if len(object_ids) != len(set(object_ids)):
        fail("V-004", "duplicate authority object_id")
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
        target = str(record.get("source", ""))
        if record.get("status") == "ACTIVE" and target.startswith(historical):
            fail("V-009", target)
    if spec.get("runtime_policy") != "validator PASS does not itself authorize runtime code; Final Architecture Gate and Code Development Admission remain authoritative":
        fail("V-010", "runtime admission boundary missing")


def validate_evidence(records: object, evidence_doc: dict, generation: object) -> None:
    if not isinstance(records, list) or not records:
        print("V-007: NOT_PASS: no current evidence records exist")
        raise SystemExit(2)
    required = set(evidence_doc.get("required_record_fields", []))
    expected_policy_version = evidence_doc.get("active_governance_policy_version")
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
        if not isinstance(record.get("change_id"), str) or not record["change_id"]:
            fail("V-007", f"{evidence_id}: change_id is empty")
        if not isinstance(record.get("commit"), str) or not SHA_RE.fullmatch(record["commit"]):
            fail("V-007", f"{evidence_id}: commit must be a full 40-character SHA")
        if record.get("registry_generation") != generation:
            fail("V-007", f"{evidence_id}: registry_generation mismatch")
        if expected_policy_version and record.get("policy_version") != expected_policy_version:
            fail("V-007", f"{evidence_id}: policy_version mismatch")
        for field in ("environment", "probe", "test_identity", "scope", "ci_run", "gate", "verifier"):
            if not isinstance(record.get(field), str) or not record[field]:
                fail("V-007", f"{evidence_id}: {field} is empty")
        if not isinstance(record.get("artifacts"), list) or not record["artifacts"]:
            fail("V-007", f"{evidence_id}: artifacts must be non-empty")
        started = parse_time(record.get("started_at"), "started_at", evidence_id)
        finished = parse_time(record.get("finished_at"), "finished_at", evidence_id)
        expires = parse_time(record.get("expires_at"), "expires_at", evidence_id)
        if finished < started or expires <= finished:
            fail("V-007", f"{evidence_id}: invalid evidence time ordering")


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
        validate_evidence(payload.get("records"), evidence_doc, spec.get("policy_generation"))
    else:
        validate_evidence(evidence_doc.get("records"), evidence_doc, spec.get("policy_generation"))
    print(json.dumps({"decision": "PASS", "mode": "EVIDENCE_VALIDATED", "validator_id": spec.get("validator_id"), "policy_generation": spec.get("policy_generation"), "runtime_admission": "BLOCKED_UNTIL_FINAL_ARCHITECTURE_GATE_AND_CODE_DEVELOPMENT_ADMISSION"}, indent=2))


if __name__ == "__main__":
    main()
