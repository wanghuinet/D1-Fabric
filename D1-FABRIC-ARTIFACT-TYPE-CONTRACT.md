# D1-Fabric Artifact Type Contract

**Project:** D1-Fabric  
**Release Target:** D1-Fabric 1.0  
**Protocol Version:** 1.0  
**Status:** MANDATORY  
**Authority:** D1-Fabric Engineering Constitution v3.0 + D1-Fabric 1.0 Development Contract v1.1  
**Purpose:** Prevent semantic drift between documentation, AI prompts, source code, configuration, automation scripts, and verification evidence.

---

## 0. Core Rule

Every repository artifact MUST have one explicit semantic responsibility.

> **File extension MUST match artifact responsibility. AI MUST NOT change an artifact's semantic type merely for execution convenience.**

A file being convenient for an operating system, shell, editor, or AI agent does not authorize changing its semantic type.

If an artifact is ambiguous between documentation and executable automation, the Coding Agent MUST STOP, classify the artifact, and choose the correct artifact type before creating or modifying it.

---

## 1. Authoritative Artifact Types

| Extension / Location | Primary responsibility | Mandatory rule |
|---|---|---|
| `.md` | Constitution, contract, design, Worker prompt, instructions, verification record, report | Natural-language engineering artifacts MUST use Markdown unless a stricter machine-readable format is explicitly required. |
| `.ts` | D1-Fabric application/runtime code | Default application source format. |
| `.tsx` | TypeScript + JSX | MUST be used only when JSX/TSX is actually required. |
| `.d.ts` | TypeScript declarations | MUST contain declarations only; no runtime implementation. |
| `.ps1` | Windows PowerShell automation | MUST contain executable PowerShell automation, not a development prompt or engineering contract. |
| `.sh` | POSIX shell automation | MUST contain executable shell automation, not a development prompt or engineering contract. |
| `.json` | Structured machine-readable data/configuration | MUST NOT be used as a substitute for a human-readable engineering contract. |
| `.yaml` / `.yml` | Configuration, CI, deployment manifests | MUST NOT be used as a substitute for an AI development prompt. |
| `verification/` | Verification evidence and records | MUST represent actual executed evidence and MUST distinguish PASS/FAIL/UNKNOWN. |
| `workers/` | Worker-specific development contracts/prompts where used | Worker prompts MUST remain documentation artifacts unless explicitly accompanied by a separate executable script. |
| `scripts/` | Automation scripts | Executable scripts belong here or another explicitly designated script location; they MUST NOT masquerade as documentation. |

---

## 2. Prompt Classification Rule

A document intended to be read by DeepSeek, Claude, GPT, or another coding agent and containing instructions such as:

- understand the repository
- inspect architecture
- implement a Worker
- follow a contract
- run tests
- verify evidence
- stop on ambiguity
- produce a report

is an **engineering prompt/documentation artifact**.

Its default format is:

```text
.md
```

It MUST NOT be converted to `.ps1` merely because the instructions mention commands such as `git`, `npm`, `pnpm`, `bun`, test runners, build commands, or shell commands.

Example:

```text
A04-WORKER-DEVELOPMENT-PROMPT.md     ← correct
run-a04-verification.ps1             ← automation only
```

The two artifacts may coexist, but they have different responsibilities.

---

## 3. Script Classification Rule

A `.ps1` or `.sh` file is valid only when the primary purpose is machine execution.

It MUST:

- contain executable commands or script logic
- have a deterministic execution purpose
- document required environment assumptions where necessary
- return meaningful success/failure status
- avoid embedding the full engineering contract

A script MAY reference a Markdown contract or prompt. It MUST NOT replace that contract.

Correct separation:

```text
CONTRACT.md
    ↓
AI reads and follows engineering rules
    ↓
verify-worker.ps1
    ↓
Machine executes deterministic verification commands
```

---

## 4. Prohibited Type Conversion

The Coding Agent MUST NOT:

- rename `.md` engineering prompts to `.ps1` for convenience
- rename contracts to `.json` merely to make them machine-readable
- put production TypeScript inside shell scripts
- put executable automation inside Markdown and claim the Markdown itself is the automation
- encode verification evidence as a script unless the artifact is genuinely an executable verifier
- create duplicate copies of the same contract in different extensions
- create a script whose only purpose is to disguise a prompt as an executable artifact

If executable automation is useful, create a separate script and keep the authoritative engineering instructions in Markdown.

---

## 5. Source-Code Boundary

D1-Fabric application logic remains TypeScript unless an explicit architecture exception is approved.

Application source MUST use only:

```text
.ts
.tsx
.d.ts
```

The presence of executable logic in a `.ps1`, `.sh`, YAML, JSON, or Markdown file does not make that logic part of the application architecture; such logic is automation/configuration and is governed separately.

The Coding Agent MUST NOT move application logic into scripts merely to reduce TypeScript file count.

---

## 6. Verification Artifact Boundary

Verification evidence MUST record what actually happened.

A verification report MUST NOT be treated as executable proof merely because it contains commands.

Conversely, an executable verification script MUST NOT be treated as evidence merely because it exists.

Required relationship:

```text
Verification Contract
        ↓
Executable Test / Verification
        ↓
Actual Result
        ↓
Evidence Record
```

`PASS` requires actual execution and applicable evidence.

`UNKNOWN` MUST NOT be promoted to `PASS` by the existence of a script, test file, or planned command.

---

## 7. Artifact Naming Contract

Names SHOULD communicate semantic responsibility directly.

Recommended patterns:

```text
D1-FABRIC-*-CONSTITUTION.md
D1-FABRIC-*-CONTRACT.md
D1-FABRIC-*-PROTOCOL.md
*-DEVELOPMENT-PROMPT.md
*-DESIGN.md
*-VERIFICATION.md
*-REPORT.md
verify-*.ps1
verify-*.sh
build-*.ps1
build-*.sh
```

Do not use misleading names such as:

```text
worker-prompt.ps1        # when it is only a prompt
contract.sh              # when it is only documentation
verification.md          # when it is intended to be executable automation
```

---

## 8. Creation Gate

Before creating a new artifact, the Coding Agent MUST answer internally:

```text
1. Is this documentation/instruction?
2. Is this application source?
3. Is this configuration?
4. Is this executable automation?
5. Is this verification evidence?
6. Is this generated/build output?
```

Exactly one primary semantic type MUST be selected.

If no type clearly fits, STOP and resolve the classification before implementation.

---

## 9. Change Gate

When modifying an existing file, the Coding Agent MUST preserve its semantic type unless an explicit artifact migration is intended and recorded.

A file extension change is a **semantic change**, not a cosmetic rename.

If changing:

```text
.md → .ps1
.ps1 → .md
.ts → .ps1
.json → .md
```

or another cross-type conversion, the agent MUST:

1. state the reason
2. identify the old responsibility
3. identify the new responsibility
4. verify that no contract/evidence/source semantics are lost
5. update references
6. verify the resulting artifact independently

Without this process, cross-type conversion is forbidden.

---

## 10. AI Stop Condition

The Coding Agent MUST STOP if:

- a requested artifact has conflicting format expectations
- a Markdown prompt is being converted to an executable script solely for convenience
- a script is being used to hide undocumented engineering rules
- an artifact would contain two unrelated semantic responsibilities
- a file extension does not match its actual primary responsibility
- duplicate copies of an authoritative contract would be created
- the agent cannot determine whether an artifact is documentation, code, configuration, automation, or evidence

STOP means: classify first; do not create speculative artifacts.

---

## 11. Worker Gate

Every Worker MUST pass artifact-type review before `CAPABILITY_PASS`.

The review MUST confirm:

```text
No prompt stored as .ps1 solely for convenience
No contract disguised as executable code
No application logic moved into scripts
No duplicate authoritative contracts
No misleading extensions
No unexplained cross-type file conversions
No verification evidence confused with executable verification
```

Any violation is `FAIL`, not `WARNING`.

---

## 12. Final Rule

> **D1-Fabric separates what AI must understand from what machines must execute.**
>
> **Markdown defines engineering intent. TypeScript implements product behavior. Scripts automate deterministic operations. Verification records prove what actually happened.**
>
> **Never collapse these responsibilities merely for convenience.**
