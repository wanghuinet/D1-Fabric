# D1-Fabric 3.2 Full Red-Team Architecture Audit

- **日期**: 2026-09-12
- **审计基线**: HEAD `d15d2197a4691eec8721355f26fe2d67bfb36df2`（main，单根提交，clean）
- **审计员**: 独立架构红队审计员 / Principal Infrastructure Architect / Governance Auditor
- **方法**: 全量 READ/TRACE + 静态攻击 + 本地实证执行 validator（只读）。审计过程中未 EDIT/COMMIT。
- **GitHub CI 运行状态无法仅凭仓库内容验证**（依赖仓库级设置），凡涉及 "CI-ENFORCED" 的判定已注明证据来源与置信度。

> 本报告为审计性文档。其结论为独立评估，不应被解释为对当前治理体系有效性的背书。

---

## 1. Executive Verdict

**CURRENT STATE: BLOCKED**

治理体系的文档层设计思路正确（分层契约、registry、diff-scope、证据绑定、生命周期），但机器执行层存在 4 个 P0 级结构性缺口，使得"错误/未准入的代码获得绿 CI"在当下可被构造：

1. **信任根自循环**：证据生产者 = 可信验证者 = 被验证对象自身。
2. **治理 CI 可信计算基（TCB）可被同一 PR 自修改**。
3. **Code Development Admission 是纯文档声明**，无任何 CI job 执行。
4. **Diff-scope fail-open**（base 不可解析时降级为空 diff → PASS，已实证）。

同时，现有 registry 数据使多个 "FAIL-CLOSED" 检查处于空转状态。

---

## 2. P0 Findings

### GAP-3.2-P0-001 — 证据链自证明：生产者 = 验证者 = 被验证对象

- **Severity**: P0 | **Status**: PROVEN | **Confidence**: HIGH
- **Source**: `.governance/3.2/kernel/validator-spec.json`（`trusted_verifiers: ["tools/governance/generate_kernel_evidence.py"]`）、`tools/governance/generate_kernel_evidence.py`（`gate_result: "pass"` 硬编码、`verifier` 自述）、`tools/governance/validate_kernel_governance.py`（仅白名单校验）
- **Observed**: 证据记录中 `verifier` 由生产者自填；`gate_result: "pass"` 为硬编码常量，不读取真实 gate 输出；validator 信任该白名单并验证生产者生成的证据；三者同 job 同 workflow 顺序执行。
- **Expected**: 验证者必须独立于生产者（独立 job/脚本/签名密钥/OIDC 断言），`gate_result` 引用真实 gate 退出码或产物。
- **Root Cause**: 信任模型把"证据生产"与"证据验证"合并为同一代码路径，白名单由被审计仓库自我声明。
- **Trigger**: 任何使 governance 脚本发生可控修改的变更（manifest 本就允许修改 `tools/governance`）。
- **Bypass Path**: 修改 `validate_kernel_governance.py` 削弱检查 → 同一提交经 `validate_change_manifest` 正常准入 → generator 生成自述 pass 证据 → validator（已削弱）验证通过 → 绿 CI。
- **Impact**: 证据不再是外部事实的证明，而是系统自我声明；KERNEL-VERIFIED 无独立可信度。
- **Required Fix**: 引入独立验证方，或以 GitHub OIDC/环境断言签名 gate 结果；`gate_result` 改为引用真实 gate 执行结果。
- **Affected**: validator-spec.json / generate_kernel_evidence.py / validate_kernel_governance.py / d1-fabric-governance.yml
- **Regression Required**: 篡改 verifier 身份、伪造 gate_result、独立 runner 复算 hash 三类负测试。
- **Code Development Blocking**: YES

### GAP-3.2-P0-002 — 治理 TCB 可自修改：workflow 与 validator 与被审计内容同源可变

- **Severity**: P0 | **Status**: PROVEN（design-level） | **Confidence**: HIGH
- **Source**: `.github/workflows/d1-fabric-governance.yml`（`on: pull_request + push`，无 pinned ref）；`tools/governance/validate_change_manifest.py`
- **Observed**: 对 `pull_request` 事件，GitHub 使用 PR merge-ref 中的 workflow 定义执行检查——PR 自己可以删除/削弱 gate step；validator 与被审计内容同仓，属"受治理变更"可合法修改范围。
- **Expected**: 治理 gate 的代码与配置相对被治理内容不可变（外部引用/pinned SHA/独立 repo）或由不可变方复核。
- **Root Cause**: 把校验器放入它要校验的仓库，且无外部复核层。
- **Trigger**: 恶意/受损 PR 修改 workflow 或 tools/governance/*.py。
- **Bypass Path**: PR 删除治理 step → PR 检查全绿 → merge；或经正常治理变更削弱 validator（P0-001）。
- **Impact**: 所有 CI 治理可被一次性静默拆除；"CI-ENFORCED" 无法成立。
- **Required Fix**: workflow/validator 从被治理仓库外引入或固定到不可变版本并由独立 check 复核。
- **Affected**: .github/workflows/*.yml、tools/governance/*
- **Regression Required**: 注入"删除 gate step 的 PR"负测试。
- **Code Development Blocking**: YES

### GAP-3.2-P0-003 — Code Development Admission 纯文档：运行时代码当前即可获绿 CI

- **Severity**: P0 | **Status**: PROVEN | **Confidence**: HIGH
- **Source**: `.governance/3.2/kernel/lifecycle-registry.json`（`current_project_state: GOVERNANCE_IMPLEMENTING`）、`.governance/3.2/config.json`（`status: DRAFT`）、3.2.5 契约、`.github/workflows/*`（worker + regression）
- **Observed**: 全部 worker workflow（W01–W06 及 regression）只做 typecheck/test/dry-run，无任何治理依赖、不检查 lifecycle 状态、不要求 admission；governance workflow 的 4 个 job 也不读取 `current_project_state`。
- **Expected**: 在 lifecycle 未达 `CODE_DEVELOPMENT_READY` 前，任何 runtime 代码变更必须被 CI 拒绝或标记 BLOCKED。
- **Root Cause**: 3.2.5 声明了准入边界，但未落地任何机器规则/CI job。
- **Trigger**: 任何声称"继续写 runtime 功能"的提交，只要把文件声明进 current.json 即可全绿。
- **Bypass Path**: 修改 worker 文件 + 更新 current.json `files` 声明 → 治理 + worker workflow 全绿 → merge；而 lifecycle 仍为 GOVERNANCE_IMPLEMENTING。
- **Impact**: Code Development Admission 完全失效；架构未验证的运行时代码持续积累。
- **Required Fix**: governance workflow 增加 admission job：读取 lifecycle 状态与准入条件，非 `CODE_DEVELOPMENT_READY` 时对 runtime 变更 FAIL。
- **Affected**: d1-fabric-governance.yml、全部 worker workflow、validate_kernel_governance.py
- **Regression Required**: lifecycle=GOVERNANCE_IMPLEMENTING 时提交 worker 代码 → 必须 FAIL。
- **Code Development Blocking**: YES

### GAP-3.2-P0-004 — Diff-scope fail-open：base 不可解析 → 空 diff → PASS

- **Severity**: P0 | **Status**: PROVEN（实证） | **Confidence**: HIGH
- **Source**: `tools/governance/validate_change_manifest.py`（`git_changed`：`git rev-parse HEAD^` 失败被吞 → 返回 `[]`）
- **Observed**: `D1_FABRIC_BASE_SHA=0000...` 时返回空列表 → `payload_changed == declared == []` → **PASS**（实测 exit 0）。本仓库为单根提交，任何"首个 push/父提交缺失"场景均走此路径。
- **Expected**: base 无法解析时 FAIL-CLOSED。
- **Root Cause**: 用"返回空列表"表达"无法比较"，把错误当成了空变更。
- **Trigger**: 首次 push / force-push 后旧 tip 不在 fetch 范围 / 父提交不可得。
- **Bypass Path**: 在 base 缺失环境推送任意内容 → diff-scope 空转 → PASS。
- **Impact**: 变更范围校验在关键路径失效；root commit 已携带全部 governance+workers 代码却零范围校验。
- **Required Fix**: base 解析失败即 fail；`git diff` 异常上抛。
- **Affected**: validate_change_manifest.py
- **Regression Required**: zero-SHA base、无效 base、无父提交三种负测试必须 FAIL。
- **Code Development Blocking**: YES

---

## 3. P1 Findings

### GAP-3.2-P1-001 — 契约状态大小写不一致 → V-003/V-009 空转

- **Severity**: P1 | **Status**: PROVEN | **Confidence**: HIGH
- **Source**: `.governance/3.2/kernel/contract-registry.json`（全部 `"status": "active"`）、`validate_kernel_governance.py`（匹配 `"ACTIVE"`）
- **Observed**: 契约状态小写 `active`；validator 取大写 `ACTIVE` → active 集合恒空 → 契约身份唯一性检查与历史源检查空转。实证 structural-only PASS。
- **Expected**: 状态枚举统一并做大小写规范化；空 active 集必须 FAIL 或显式声明。
- **Bypass Path**: 契约 registry 放两条重复 ACTIVE 契约（或历史路径）仍 PASS。
- **Impact**: 契约唯一性与历史隔离的机器检查形同虚设。
- **Required Fix**: 统一枚举并做归一化；active 集合为空时告警。
- **Code Development Blocking**: YES（架构层）

### GAP-3.2-P1-002 — authority/capacity registry 为空 → V-004/V-005/V-008 MISSING→PASS

- **Severity**: P1 | **Status**: PROVEN | **Confidence**: HIGH
- **Source**: `.governance/3.2/kernel/authority-registry.json`（`records: []`）、`.governance/3.2/kernel/capacity-cost-provider-registry.json`（`records: []`）
- **Observed**: 空数组使唯一性/必填字段/容量完整性检查全部空转通过；registry 声明的规则未被强制。
- **Expected**: 声明 FAIL-CLOSED 的规则在数据缺失时必须 FAIL（或显式 bootstrap 豁免）。
- **Bypass Path**: 保持 records 为空 → 结构 gate 恒绿。
- **Impact**: 权威源、写入者、恢复源等关键信息无机器约束。
- **Code Development Blocking**: YES（架构层）

### GAP-3.2-P1-003 — Legacy 隔离漏掉 workers/old1.0、workers/old2.0

- **Severity**: P1 | **Status**: PROVEN | **Confidence**: HIGH
- **Source**: `validate_change_manifest.py`、`validate_behavioral_governance.py`（历史前缀仅 `archive/api-v1.0/`、`archive/legacy/`）；`.governance/3.2/config.json`（forbidden_active_prefixes 不含 `workers/old`）
- **Observed**: 全仓实际存在 `workers/old1.0/` 与 `workers/old2.0/contracts/*.ts`（真实 TS 契约），这些路径可被随意修改且不触发任何历史隔离 FAIL；全仓无可写 grep 引用它们（读取侧无隔离标记）。
- **Expected**: 所有实际 legacy 路径纳入统一历史前缀集并逐层一致。
- **Bypass Path**: 修改 workers/old2.0/contracts/xxx.ts → 历史隔离绿 → 旧契约被"复活"为当前素材。
- **Impact**: B-07（P0 规则）声明与机器执行断裂。
- **Code Development Blocking**: YES

### GAP-3.2-P1-004 — Evidence Registry 永不落库；`empty_registry_meaning` 从未被评估

- **Severity**: P1 | **Status**: PROVEN | **Confidence**: HIGH
- **Source**: `.github/workflows/d1-fabric-governance.yml`（只校验 ephemeral `.governance/3.2/kernel/ci-evidence.generated.json`）、`.governance/3.2/kernel/evidence-registry.json`（`records: []` 恒空）
- **Observed**: CI 生成并校验 ephemeral 证据，但从不回写 registry；无 step 检查 registry records 是否为空；声明的 `empty_registry_meaning: NOT_PASS` 没有任何机器消费方；上传 artifact 之后无 gate 读取。
- **Expected**: 每次 pass 将证据持久化进 registry（或由独立 job 复核 artifact）；空 registry 在架构准入时强制 NOT_PASS。
- **Bypass Path**: registry 恒空 → 未来准入 gate 被绕过改为只信 ephemeral 文件（当前即如此）。
- **Impact**: 证据链无持久、可重放、可审计的存储。
- **Code Development Blocking**: YES

### GAP-3.2-P1-005 — Change Manifest 自我认证：actor/risk/expiry 无外部见证

- **Severity**: P1 | **Status**: PROVEN | **Confidence**: HIGH
- **Source**: `.governance/3.2/changes/current.json`（actor=automation 自述、risk=controlled 自述、expiry=9999-12-31）；`validate_change_manifest.py`（current.json 从 diff-scope 双侧剔除）
- **Observed**: actor.type/id、risk、verification_plan、policy_version、expiry 全由作者自填且无 git committer/PR 关联/OIDC 校验；expiry 恒为 9999-12-31 = 无过期。
- **Expected**: actor 绑定 git 身份/CI 身份；risk 有可核查证据引用；expiry 有策略上限。
- **Bypass Path**: 任意提交改 worker 文件 + current.json → diff-scope 通过，同时改 risk=controlled、actor=automation → 全绿。
- **Impact**: 谁批准、多高风险、何时过期完全不可信。
- **Code Development Blocking**: YES

### GAP-3.2-P1-006 — Dependency DAG 校验不完整（孤儿/幽灵边/缺终点/缺覆盖）

- **Severity**: P1 | **Status**: PROVEN | **Confidence**: HIGH
- **Source**: `validate_change_manifest.py`（只检查环与 W06 bootstrap）、`.governance/3.2/dependencies/registry.json`
- **Observed**: 不检查边指向幽灵节点、孤儿节点、6 个 active worker 是否全部出现在 DAG、缺终点、边类型合法性。
- **Expected**: 节点闭包、无幽灵边、terminal 覆盖、worker 全覆盖。
- **Bypass Path**: 新增 `{"from":"W01","to":"GHOST-X"}` 或删除 W02 全部边 → 仍 PASS。
- **Impact**: 依赖拓扑漂移无法被机器发现。
- **Code Development Blocking**: NO（当前数据正确，防御性加固）

### GAP-3.2-P1-007 — 强制执行依赖仓库外设置（branch protection），仓库内不可验证

- **Severity**: P1 | **Status**: DESIGN-GAP | **Confidence**: MEDIUM
- **Source**: 全部 workflow
- **Observed**: 治理 workflow 是否"强制"取决于 GitHub 分支保护设置，该设置不在仓库内，无法从内容自证 CI-ENFORCED。
- **Expected**: 仓库内自文档化强制策略。
- **Code Development Blocking**: YES（在确认强制层前）

---

## 4. P2 Findings

- **GAP-3.2-P2-001 — Capability 全部 `proposed` 未被机器约束**：capabilities/registry.json 5 条能力全部 status=proposed，而 W03/W04/W06 已实现并引用；无 validator 检查 capability status。Blocking: NO。
- **GAP-3.2-P2-002 — evidence/schema.json 是死代码且与记录形状冲突**：schema `additionalProperties:false` 且不含真实记录字段（ci_workflow/ci_job/dag_edges/gate_result/admission_decision...），CI 只做 JSON 解析检查，schema 从未应用于记录。Blocking: NO。
- **GAP-3.2-P2-003 — 状态/版本语义变体未归一**：`active` vs `ACTIVE` vs `DRAFT_ENFORCEMENT`；`schema_version` vs `registry_version` vs `validator_version`；`3.2.0` vs `1.0.0`。Blocking: NO。
- **GAP-3.2-P2-004 — registry-integrity-rules.json（KERNEL-REG-001~007）无直接机器消费方**：规则只被 validator 间接、部分实现（且被 P1-001/002 空转）。Blocking: NO。
- **GAP-3.2-P2-005 — 证据时间窗无真实性校验**：`started_at == finished_at`（零时长）被接受；时间不与该 CI run 的真实起止交叉验证；7 天 expiry 因 registry 永不落库而未生效。Blocking: NO。

---

## 5. P3 Findings

- **GAP-3.2-P3-001 — 退出码/错误码不统一**：validator 混用 exit 1/2；V-007 被十余个不同检查复用，日志区分度低。
- **GAP-3.2-P3-002 — 单根提交，无历史基线**：diff-scope/reproducibility 缺少可回放基线。
- **GAP-3.2-P3-003 — governance workflow 无 concurrency 控制**：并行 push 可产生竞争证据。
- **GAP-3.2-P3-004 — worker workflow 的验证 marker 仅 echo**：不被任何机器消费。
- **GAP-3.2-P3-005 — 本地无 CI 环境时证据校验自动 fail**：需伪造 5 个 GITHUB_* 变量才能本地复现。

---

## 6. Master Gap Register

```
P0: 4   → GAP-3.2-P0-001 ~ 004
P1: 7   → GAP-3.2-P1-001 ~ 007
P2: 5   → GAP-3.2-P2-001 ~ 005
P3: 5   → GAP-3.2-P3-001 ~ 005
```

| GAP-ID | Sev | Status | Blocking | Confidence |
|---|---|---|---|---|
| GAP-3.2-P0-001 | P0 | PROVEN | YES | HIGH |
| GAP-3.2-P0-002 | P0 | PROVEN | YES | HIGH |
| GAP-3.2-P0-003 | P0 | PROVEN | YES | HIGH |
| GAP-3.2-P0-004 | P0 | PROVEN | YES | HIGH |
| GAP-3.2-P1-001 | P1 | PROVEN | YES | HIGH |
| GAP-3.2-P1-002 | P1 | PROVEN | YES | HIGH |
| GAP-3.2-P1-003 | P1 | PROVEN | YES | HIGH |
| GAP-3.2-P1-004 | P1 | PROVEN | YES | HIGH |
| GAP-3.2-P1-005 | P1 | PROVEN | YES | HIGH |
| GAP-3.2-P1-006 | P1 | PROVEN | NO | HIGH |
| GAP-3.2-P1-007 | P1 | DESIGN-GAP | YES | MEDIUM |
| GAP-3.2-P2-001~005 | P2 | PROVEN | NO | MEDIUM-HIGH |
| GAP-3.2-P3-001~005 | P3 | PROVEN | NO | MEDIUM |

---

## 7. Document Consistency Audit

- 契约链 3.2.1–3.2.6 与 contract-registry.json 一一对应（6 条，路径真实存在）。一致。
- 3.2.6 契约对 `trusted_verifiers`/生产者-验证者分离无声明 → 机器层的 "producer=verifier" 设计无文档授权（P0-001 佐证）。
- 3.2.5 声明 "runtime SHALL remain blocked / admission result SHALL be machine-readable / runtime admission remains mechanically gated" → 与机器事实冲突（P0-003）。
- FINAL-ARCHITECTURE-GATE 文档声明 P0/P1 gate PASS 才准入、"CI can reject unauthorized changes" → 无 CI 实现该 gate。
- config.json `forbidden_active_prefixes` 与实际 legacy 目录不匹配（P1-003）。

## 8. Machine Governance Audit

Document→Machine 断裂清单：
- 3.2.5 admission 边界 → 无机器规则（P0-003）。
- B-07 历史隔离（声明 P0）→ 机器仅覆盖部分前缀（P1-003）。
- KERNEL-REG-001/002/005 FAIL-CLOSED → validator 空转（P1-001/002）。
- evidence `empty_registry_meaning=NOT_PASS` → 无消费方（P1-004）。
- 已生效的真实机器规则（方向正确）：diff-scope 精确匹配、ADR/ownership/binding/DAG 环检查、拓扑锁定、bootstrap 安全。

## 9. Evidence DAG Audit

- **fail-closed 成立的部分**：`validate_evidence` 对空 records 强制 NOT_PASS（exit 2）；commit/ci_run/ci_workflow/ci_job/ci_event/ci_ref/verifier/generation/policy_version/gate/admission_decision/时间窗/artifact sha256/DAG 9 边全部校验，commit 与 CI 身份来自 GitHub 注入环境。
- **fail-closed 不成立的部分**：① 记录 `verifier`/`gate_result` 由生产者自述（P0-001）；② 证据只在本 run 内有效，registry 恒空（P1-004）；③ schema 未应用（P2-002）。
- Kernel Structural Gate 产出 `KERNEL-VERIFIED`，admission_decision 声明 `ARCHITECTURE-ADMISSION-BLOCKED`——边界文字正确；但文字为自述常量，且无 "Final Architecture Gate" 消费方。
- **结论：Evidence DAG 在"记录字段层面"fail-closed，在"信任根层面"不自洽。**

## 10. Kernel Validator Audit

- 结构检查 V-001~V-010 中：V-001/002/006/007(结构部分)/010 有效；**V-003/V-004/V-005/V-008/V-009 因数据形态空转**（P1-001/002）。
- **false PASS 路径已实证**：空 authority、小写 active 契约、空 capacity 下 structural-only = PASS。
- `--evidence-file` 模式会先重跑结构检查再验证据，方向正确；但"验证者与生产者为同一代码"使 false PASS 无法被独立发现。

## 11. Change Manifest / Diff Scope Audit

- **真实有效**：files↔实际 diff 严格比对（排除 current.json）；unsafe path 检查；evidence_artifacts 文件存在性；ADR/ownership/binding/DAG/拓扑检查。
- **攻击未封闭**：① zero-base → 空 diff PASS（P0-004，实证）；② current.json 双侧豁免（P1-005）；③ 声明即自我认证，无外部见证（P1-005）。
- merge commit / rename / delete：`git diff --name-only` 覆盖 rename/delete，未见绕过。

## 12. Registry Integrity Audit

- ID 唯一性：adr/capability/owner/binding 有校验；contract/authority 因数据形态空转（P1-001/002）。
- 引用完整性：capability.owner→ownership、binding_refs→bindings 有校验；dependency 边端点无校验（P1-006）。
- 状态合法性：ADR status 校验存在；contract/capability/behavior/recovery status 无统一归一（P1-001/P2-003）。
- 语义多写法确认存在（P2-003）。

## 13. CI / Provenance Audit

- **正确项**：`permissions: contents: read`（最小权限）；无 secrets；`fetch-depth: 0`；artifact `if-no-files-found: error`；artifact 仅在成功路径上传；证据绑定 commit/run/workflow/job/event/ref。
- **缺陷**：workflow/validator 可自修改（P0-002）；强制力依赖仓库外设置（P1-007）；PR merge-ref SHA 为临时 SHA，证据对 main 上最终提交不直接适用；无 concurrency（P3-003）。
- **失败可观测性**：错误码 + 具体 detail 输出总体可定位到 Gate/文件/字段；未发现"只给 exit 1 无可观测信息"的缺陷。

## 14. Lifecycle / Admission Audit

- 状态机定义完整，当前 `GOVERNANCE_IMPLEMENTING`，与 config `DRAFT` 一致。
- **非法跳转/绕过状态**：无机器阻止——CI 不读状态（P0-003）。
- **stale evidence 复用**：registry 恒空所以无 stale 可复用；evidence 绑定 commit，validator 强制 equal current checkout——方向已 fail-closed。

## 15. Legacy Isolation Audit

- 现状：grep 全仓无任何代码引用 `old1.0/old2.0`（读取隔离良好）；但 workers/old2.0 内是真实 TS 契约文件，可被误读为当前规范（无隔离标记、无 gate 阻止修改）。
- 机器层：`archive/api-v1.0/`、`archive/legacy/` 被拦截；`workers/old1.0/`、`workers/old2.0/`、部分历史文档不拦截（P1-003）。
- **结论：Legacy 目录当前未被引用，但"可被复活为当前素材"的路径未封闭。**

## 16. Self-Proving / Circular Evidence Audit

存在完整的循环信任链（P0-001 + P0-002 + P1-005 组合）：

```
current.json（作者自写）→ generator（verifier=自己, gate_result="pass" 硬编码）
→ validator（白名单=generator 自己）→ workflow（同 PR 可改）→ 绿 CI
```

- `current.json` 同时承担：**change declaration + evidence artifact + verification input + proof source**。
- 该链中没有任何一环来自不可变/外部权威。

## 17. World-Class Infrastructure Gap Analysis

| 能力 | 现状 | 评价 |
|---|---|---|
| fail-closed | 部分 | 证据字段层强；数据形态层空转（P1-001/002）、base fail-open（P0-004） |
| provenance | 中 | commit/CI 绑定强；verifier/gate_result 自述（P0-001） |
| determinism | 中 | 单根提交无基线；零时长时间戳（P2-005） |
| TCB 不可变性 | 差 | 校验器与内容同源（P0-002) |
| admission 强制 | 差 | 纯文档（P0-003） |
| observability | 良 | 错误码+detail；V-007 复用（P3-001） |
| auditability | 中 | 证据不落库（P1-004） |
| 变更控制 | 良 | diff-scope 精确匹配（排除 manifest 豁免） |
| 依赖控制 | 中 | 环检查有；完整性缺（P1-006） |
| 生命周期管理 | 差 | 状态无人执行（P0-003） |
| 安全边界 | 良 | 最小权限、无 secrets；缺自修改防护（P0-002） |

## 18. Attack Paths That Could Still Reach PASS

1. 静默拆门：PR 修改 governance workflow/validator → 自删 gate → 绿（P0-002）。
2. 声明即准入：worker 代码 + current.json 同步声明 → 全绿，lifecycle 仍 GOVERNANCE_IMPLEMENTING（P0-003）。
3. 空转数据：保持 authority/capacity 空、契约小写 active → 结构 gate 恒绿（P1-001/002，已实证）。
4. 历史复活：改 workers/old2.0/contracts/*.ts → 历史隔离绿（P1-003）。
5. 自证循环：改 validator 削弱 → 自产 pass 证据 → 自验通过（P0-001）。
6. 空基线下推任意树：zero-base 推送 → 空 diff → PASS（P0-004，已实证）。

## 19. Required Repair Plan

按序（P0 先行）：
1. **P0-002/001**：将 workflow 与 validator 移出可自修改域（pinned ref / 独立仓库 / 独立复核 job）；拆分 producer 与 verifier；`gate_result` 绑定真实 gate 输出。
2. **P0-003**：governance workflow 增加 admission job，读取 lifecycle 状态，非 `CODE_DEVELOPMENT_READY` 时 runtime 变更 FAIL；worker workflow 依赖治理 gate。
3. **P0-004**：diff-scope base 解析失败即 fail。
4. **P1-001/002/003**：状态归一 + 空 registry FAIL + 统一历史前缀（含 workers/old*）。
5. **P1-004/005/006/007**：证据持久化协议；actor/risk/expiry 外部见证；DAG 完整性；仓库内强制层声明。
6. 建立基线提交/tag，补负测试（每 GAP 的 Regression Required）。

## 20. Final Development Admission Decision

| 项 | 结论 |
|---|---|
| **CURRENT STATE** | **BLOCKED** |
| **P0: 4** / **P1: 7** / **P2: 5** / **P3: 5** | — |
| **ARCHITECTURE ADMISSION** | **BLOCKED**（无 Final Architecture Gate 执行；state=GOVERNANCE_IMPLEMENTING） |
| **CODE DEVELOPMENT ADMISSION** | **BLOCKED（声明） / NOT-ENFORCED（机器）** |

---

## Appendix — 最终问题回答

- 当前 3.2 是否允许继续增加 Runtime 功能？**NO**。
- 当前 3.2 是否允许进入 Code Development？**NO**。
- 当前是否允许 Architecture Admission？**NO**。
- EMPTY→PASS / MISSING→PASS / UNDECLARED→PASS / LEGACY→CURRENT：**存在**。
- STALE→PASS / WRONG SHA→PASS / WRONG CI→PASS / WRONG OWNER→PASS：**不存在**（已 fail-closed）。
- Document→Machine Enforcement 断裂：**是**（P0-003、P1-003、P1-004、KERNEL-REG-001/002 空转）。
- Evidence DAG 是否真正 fail-closed？**字段层是，信任根层否**（P0-001；P1-004）。
- Kernel Validator 是否可能出现 false PASS？**是，且已实证**。
- Change Manifest / Diff Scope 是否真正 fail-closed？**否**（P0-004；P1-005）。
- Legacy / old 目录是否真正隔离？**读取侧是（无引用），变更侧否**（P1-003）。
- 现在开始大量代码开发的前三大风险：① TCB 自修改静默拆除治理（P0-002）；② 未准入 runtime 代码以绿 CI 堆积（P0-003）；③ 证据与 registry 空转使未来架构准入无真实依据（P0-001/P1-001/002/004 复合）。

> 本报告为审计性文档。其结论为独立评估，不应被解释为对当前治理体系有效性的背书。