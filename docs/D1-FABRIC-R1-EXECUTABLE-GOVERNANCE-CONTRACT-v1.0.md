# D1-Fabric R1 Executable Governance Contract v1.0

Status: ACTIVE / R1 IMPLEMENTATION

## 1. Purpose

R1 converts the Foundation Blueprint from declarative policy into repository-enforced policy.

A governance PASS is valid only when the machine validator has evaluated the repository state and the applicable changed-file scope.

## 2. Machine Authorities

| Governance concern | Machine authority | Enforcement |
|---|---|---|
| Capability | `.d1-fabric/registry/capabilities.json` | required fields, unique IDs, admission metadata |
| ADR | `.d1-fabric/registry/adrs.json` + `docs/adr/` | ID, status, record and decision integrity |
| Ownership | `.d1-fabric/registry/ownership.json` | W01-W04 ownership and path mapping |
| Dependency | `.d1-fabric/registry/dependencies.json` | DAG acyclicity + forbidden imports |
| Binding | `.d1-fabric/registry/bindings.json` | Worker/service-binding least privilege |
| Scope | `.d1-fabric/change-manifest.json` | changed-file allow/deny gate |
| Validator | `tools/governance/validate_foundation.py` | executable policy evaluation |
| CI | `.github/workflows/foundation-governance.yml` | required repository gate |

## 3. Capability Admission

A new capability MUST have a unique stable ID and all required registry fields before it is considered admitted.

Required fields include classification, implementation mode, owner, module, Worker/domain, dependencies, native substrate, bindings, contracts, status and verification plan.

`REPLACEMENT` is always blocked unless an explicit architecture approval exists.

## 4. ADR Admission

Architecture changes require an ADR ID in the Change Manifest.

An ADR must have a registry entry and a real record file. Approved ADRs must contain a decision. Supersession is explicit and cannot be inferred from filenames.

## 5. Ownership

Only W01-W04 are active independently deployable Workers at the current baseline.

W05/W06 are reserved labels. A deployable `wrangler.toml` under those boundaries is a governance violation.

## 6. Dependency

The declared module graph MUST be acyclic. Forbidden Worker-to-Worker implementation imports are checked against source files.

The graph is an architecture contract, not documentation.

## 7. Binding

Cloudflare bindings are treated as architectural permissions.

A service binding must target an explicitly authorized Worker boundary. W05/W06 bindings are forbidden at the current baseline. Future convenience bindings are forbidden.

R2/R3 will extend this gate to resource names, environment separation and all supported Cloudflare binding classes.

## 8. Change Manifest / Diff Scope

Every governed change has an active manifest defining:

- task/stage;
- approved ADRs;
- approved capabilities;
- approved paths;
- forbidden paths;
- architecture-change requirements.

Any changed file outside the approved path set is a CI failure.

An architecture-scoped change without a valid approved ADR is a CI failure.

## 9. Evidence

CI records:

- exact commit SHA;
- registry snapshots;
- Change Manifest;
- validator result;
- runtime/tool version.

The evidence artifact is tied to the commit and is not itself an authority.

## 10. R1 Boundary

R1 does not yet claim full enforcement of:

- API/schema compatibility;
- Cloudflare runtime limit envelopes;
- IaC/environment drift;
- dependency vulnerability/license policy;
- cost regression budgets;
- SLO/error budgets;
- observability schema compatibility.

Those belong to R2/R3/R4.

## 11. Stop Condition

R1 is complete only when:

1. all six machine governance authorities exist;
2. validator executes in GitHub Actions;
3. governance violations fail CI;
4. evidence is emitted;
5. pre-existing architecture drift is explicitly tracked and either repaired or accepted through an approved exception.

Only then may R2 begin.
