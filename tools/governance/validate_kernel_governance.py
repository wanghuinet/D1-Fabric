#!/usr/bin/env python3
"""D1-Fabric 3.2.6 Governance Kernel registry validator.

The validator distinguishes structural validity from evidence completeness.
An empty evidence registry is explicitly NOT_PASS and can never be reported
as PASS. The validator never grants runtime admission.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KERNEL = ROOT / ".governance" / "3.2" / "kernel"

FILES = (
    "contract-metadata.schema.json",
    "authority-record.schema.json",
    "contract-registry.json",
    "authority-registry.json",
    "lifecycle-registry.json",
    "evidence-dag-registry.json",
    "evidence-registry.json",
    "capacity-cost-provider-registry.json",
    "registry-integrity-rules.json",
    "validator-spec.json",
)


def load(name: str):
    path = KERNEL / name
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail("V-001", f"missing {name}")
    except json.JSONDecodeError as exc:
        fail("V-001", f"invalid JSON {name}: {exc}")


def fail(code: str, detail: str) -> None:
    print(f"{code}: {detail}")
    raise SystemExit(1)


def main() -> None:
    docs = {name: load(name) for name in FILES}
    spec = docs["validator-spec.json"]

    # V-001: all declared kernel inputs must exist and parse.
    declared = set(spec.get("inputs", []))
    missing = declared - set(docs)
    if missing:
        fail("V-001", f"undeclared/unavailable inputs: {sorted(missing)}")

    # V-002: all dependent registries share the active policy generation.
    generation = spec.get("policy_generation")
    for name, doc in docs.items():
        if "policy_generation" in doc and doc["policy_generation"] != generation:
            fail("V-002", f"{name}: {doc.get('policy_generation')} != {generation}")

    # V-003: active contracts have unique identity.
    contracts = docs["contract-registry.json"].get("records", [])
    active = [x for x in contracts if x.get("status") == "ACTIVE"]
    identities = [(x.get("contract_id"), x.get("version")) for x in active]
    if any(not cid or not ver for cid, ver in identities):
        fail("V-003", "active contract missing contract_id/version")
    if len(identities) != len(set(identities)):
        fail("V-003", "duplicate active contract identity")

    # V-004/V-005: one authority record per mutable object and required fields.
    authorities = docs["authority-registry.json"].get("records", [])
    object_ids = [x.get("object_id") for x in authorities]
    if any(not x for x in object_ids):
        fail("V-005", "authority record missing object_id")
    if len(object_ids) != len(set(object_ids)):
        fail("V-004", "duplicate authority object_id")
    required = {
        "object_type", "object_id", "authority_owner", "authoritative_store",
        "authoritative_writer", "version_field", "generation_or_epoch",
        "mutation_policy", "read_replicas", "cache_policy", "stale_reader_policy",
        "conflict_policy", "bootstrap_source", "recovery_source", "audit_source",
    }
    for record in authorities:
        missing_fields = sorted(required - record.keys())
        if missing_fields:
            fail("V-005", f"{record.get('object_id')}: {missing_fields}")

    # V-006: lifecycle declares every transition and current state.
    lifecycle = docs["lifecycle-registry.json"]
    states = set(lifecycle.get("states", []))
    for transition in lifecycle.get("forward_transitions", []):
        if len(transition) != 2 or transition[0] not in states or transition[1] not in states:
            fail("V-006", str(transition))
    if lifecycle.get("current_project_state") not in states:
        fail("V-006", "current_project_state is not declared")

    # V-007: DAG definition AND actual evidence records must be complete.
    dag = docs["evidence-dag-registry.json"]
    nodes = set(dag.get("node_types", []))
    required_nodes = {"CONTRACT", "INVARIANT", "MACHINE_RULE", "TEST_OR_PROBE", "ARTIFACT", "COMMIT", "CI_RUN", "EVIDENCE", "GATE", "ADMISSION_DECISION"}
    if not required_nodes.issubset(nodes):
        fail("V-007", f"missing DAG node types: {sorted(required_nodes - nodes)}")
    terminal = dag.get("terminal_integrity", {})
    if terminal.get("evidence_record_required_before_architecture_pass") is not True:
        fail("V-007", "architecture evidence requirement is not fail-closed")

    evidence = docs["evidence-registry.json"]
    records = evidence.get("records")
    if not isinstance(records, list):
        fail("V-007", "evidence registry records must be an array")
    if not records:
        print("V-007: NOT_PASS: evidence registry is empty; no current architecture evidence exists")
        print(json.dumps({
            "decision": "NOT_PASS",
            "validator_id": spec.get("validator_id"),
            "policy_generation": generation,
            "checks": [f"V-{i:03d}" for i in range(1, 11)],
            "incomplete_checks": ["V-007"],
            "runtime_admission": "BLOCKED_UNTIL_FINAL_ARCHITECTURE_GATE_AND_CODE_DEVELOPMENT_ADMISSION"
        }, ensure_ascii=False, indent=2))
        raise SystemExit(2)

    required_evidence_fields = set(evidence.get("required_record_fields", []))
    for record in records:
        missing_fields = sorted(required_evidence_fields - record.keys())
        if missing_fields:
            fail("V-007", f"{record.get('evidence_id', 'unknown')}: missing evidence fields {missing_fields}")
        if record.get("result") != "pass":
            fail("V-007", f"{record.get('evidence_id', 'unknown')}: result is not pass")

    # V-008: capacity records must not claim PASS with unknown limits/policy.
    capacity = docs["capacity-cost-provider-registry.json"]
    for record in capacity.get("records", []):
        if not record.get("hard_limits") or not record.get("saturation_threshold") or not record.get("degradation_policy"):
            fail("V-008", f"incomplete capacity record: {record.get('resource', 'unknown')}")

    # V-009: current kernel registries may not activate historical authority.
    historical = ("archive/api-v1.0/", "archive/legacy/", "old/", "legacy/")
    for record in contracts:
        target = str(record.get("source", ""))
        if record.get("status") == "ACTIVE" and target.startswith(historical):
            fail("V-009", target)

    # V-010: validator itself cannot grant runtime admission.
    if spec.get("runtime_policy") != "validator PASS does not itself authorize runtime code; Final Architecture Gate and Code Development Admission remain authoritative":
        fail("V-010", "runtime admission boundary missing")

    print(json.dumps({
        "decision": "PASS",
        "validator_id": spec.get("validator_id"),
        "policy_generation": generation,
        "checks": [f"V-{i:03d}" for i in range(1, 11)],
        "runtime_admission": "BLOCKED_UNTIL_FINAL_ARCHITECTURE_GATE_AND_CODE_DEVELOPMENT_ADMISSION"
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
