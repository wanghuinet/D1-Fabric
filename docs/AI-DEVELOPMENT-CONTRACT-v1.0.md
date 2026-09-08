# D1-Fabric AI 开发与 GitHub Push 硬门禁合同 v1.0

> 状态：ACTIVE
> 
> 本合同是 D1-Fabric 后续 AI/DeepSeek 开发、代码提交、Push、CI 与阶段验收的强制执行规则。

## 1. 合同定位

D1-Fabric 采用 Contract First、Owner First、Move-not-Copy、Middleware Purity 原则。

DeepSeek/其他 AI 是**实施代理（Implementation Agent）**，不是架构、产品、数据库或范围决策者。

AI 不得：

- 自行重新设计架构；
- 自行增加 Worker、模块、数据库表或 API；
- 改变既定语义 Owner；
- 把业务代码继续塞进 Middleware Worker；
- 为“方便实现”复制第二份业务语义；
- 越过当前阶段实现未来功能；
- 通过删除功能、删除错误处理、删除权限、删除恢复机制或降低测试标准来追求少代码；
- 用“能编译”代替“完成”；
- 虚构测试、Benchmark、CI 或验收证据。

遇到合同与现有代码冲突时，**STOP，不得自行裁决**；必须报告冲突。

---

## 2. Middleware 与 Business 的硬隔离

### 2.1 Middleware 物理边界

当前 Middleware 固定为：

| 逻辑 | Worker | 职责 |
|---|---|---|
| M00 | W01 Runtime Gateway | 请求运行时边界、request/deadline/CORS/统一运行时入口 |
| M01 | W02 Router + W03 Query + W04 Write | 路由、查询、写入、D1 Data Plane |
| M02 | W05 Cache | 通用缓存与失效 |
| M03 | W06 Control & Recovery | 控制面、完整性、恢复、迁移相关通用能力 |

W02/W03/W04 在逻辑上保持独立职责，即使当前可作为同一物理 Data Plane 部署。

### 2.2 Business 逻辑边界

业务语义固定由以下逻辑 Owner 承担：

- B01 Identity/User
- B02 Content
- B03 Media
- B04 Social
- B05 Feed
- B06 Recommendation
- B07 Search
- B08 Creator
- B09 Notification
- B10 Moderation
- B11 Analytics
- B12 Topic
- B13 History
- B14 Monetization
- B15 AI / Agent（未来）
- B16 Realtime（未来）
- B17 Ranking / Feature（未来）
- B18 Developer Platform（未来）
- B19 Design / Creative（未来）
- B20 Payment / Order（未来）
- B21 Trust / Security（未来）

**逻辑边界先冻结，物理 Worker 按实际需要实例化。**

预留边界不等于现在创建空 Worker。

---

## 3. Middleware Purity Contract

Middleware Worker 中禁止出现任何业务语义，包括但不限于：

- article/video/image/dynamic/audio/qa/live/ai 等内容类型判断；
- author/user/profile 等业务实体语义；
- like/comment/follow/favorite/share/report 等社交语义；
- feed/recommend/search/topic/history/notification/creator/monetization 等业务规则；
- 内容发布流程；
- 媒体业务生命周期；
- 业务权限规则；
- 业务统计口径；
- 业务状态机；
- 业务表名、业务字段名和业务事务编排。

Middleware 只能提供通用能力：

- request/runtime boundary；
- routing/placement；
- generic query；
- generic write；
- generic cache；
- generic retry/deadline/idempotency；
- generic integrity/recovery；
- 通用安全、错误、观测与资源边界。

### 3.1 Move-not-Copy

发现业务代码时必须：

1. 确认语义 Owner；
2. 将业务实现迁移到 Owner；
3. Middleware 保留必要的通用底座能力；
4. 更新调用关系；
5. 完成兼容性验证；
6. 删除 Middleware 中旧业务实现。

**禁止先复制一份业务代码到 Business Worker，再长期保留 Middleware 副本。**

分离不能以删除业务功能为代价，必须完成“迁移而非丢失”。

---

## 4. 当前已知必须治理的边界问题

### W04 Write Engine

W04 必须最终只负责通用写入能力。

当前 `publish.ts` 中的内容发布业务必须迁移到 B02 Content，包括：

- content type；
- asset role；
- author；
- title/summary/body；
- visibility/category/language/region；
- publish operation；
- publish assets；
- content stats；
- 内容发布事务与业务校验。

W04 保留通用：

- INSERT/UPDATE/DELETE；
- idempotency；
- deadline；
- bounded retry；
- generic write error；
- generic transaction/write primitives（仅限底座能力）。

### W06 Control & Recovery

W06 不得内置 `platform_content`、`platform_publish_operations`、`platform_publish_assets` 等业务表的业务规则。

必须将业务特定完整性检查迁移至对应 Business Owner；W06 只保留通用完整性、恢复、控制面能力。

---

## 5. API Contract

所有业务 API 统一使用：

`/api/v1/*`

统一请求上下文：

- request_id
- trace_id（需要时）
- authentication
- authorization
- timestamp/deadline
- API version
- idempotency key（写操作需要时）

统一错误结构：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "human readable message",
    "request_id": "..."
  }
}
```

统一分页响应：

```json
{
  "data": [],
  "next_cursor": null,
  "has_more": false,
  "request_id": "..."
}
```

禁止各 Business Worker 自行发明第二套错误、分页、认证、幂等和请求上下文规范。

---

## 6. Authentication / Authorization

B01 必须包含：

- account；
- user；
- profile；
- authentication；
- session/credential；
- role；
- permission；
- account status；
- 用户设置。

业务 Worker 可以声明所需权限，但不能复制第二套身份系统。

---

## 7. Data Contract

数据库开发必须严格执行：

**Owner → Data Contract → Schema → Index → Implementation → Verification**

规则：

- 每个业务数据必须有明确语义 Owner；
- D1-Fabric 是数据访问底座，不是业务 Owner；
- Business Worker 不得自行实现 shard routing/fanout/retry/recovery；
- Business → D1-Fabric → D1；
- D1-Fabric 负责通用路由、查询、写入和资源边界；
- 数据库设计优先最少 D1 写入、最少重复查询、合理索引、可缓存读；
- 不得为了“方便”复制同一业务状态到多个权威表。

Mutable state 必须存在唯一 authoritative owner。

---

## 8. Async / Side Effect Boundary

同步主链路禁止形成无边界级联，例如：

`B04 → B09 → B11 → B06 → Middleware`

当副作用不需要阻塞主事务时，优先使用异步事件契约。

但禁止在没有实际需求、容量证据和边界定义时，提前创建 MQ/Event Worker。

原则：**先定义事件契约，后按真实规模实例化基础设施。**

---

## 9. MVP Business Scope

第一版业务闭环固定为：

B01 + B02 + B03 + B04 + B05 + B06 + B07 + B12 + B13

核心用户路径：

`注册 → 登录 → 个人资料 → 发布 → Feed → 浏览 → 点赞 → 评论 → 收藏 → 关注 → 推荐 → 搜索 → 话题 → 历史`

B08/B09/B10/B11/B14 作为 V2 扩展；B15–B21 为后续阶段。

不得因“顺便实现”提前扩大当前阶段范围。

---

## 10. Media Contract

媒体业务归 B03 Media。

- 图片/视频/音频等二进制对象进入 R2/Object Storage；
- D1 保存媒体元数据与生命周期状态；
- upload/multipart/object lifecycle/thumbnail/transcoding/CDN 等属于 Media 业务能力；
- Middleware 不得理解业务媒体角色。

---

## 11. Feed / Recommendation / Search Contract

### Feed

MVP 使用 cursor pagination。

禁止无界 offset 与无界 fanout。

第一版排序允许使用：

- freshness；
- time decay；
- basic popularity；
- basic interest。

复杂 ML ranking 后置。

### Recommendation

推荐系统必须保留 feature/version/experiment 的演进空间，但第一版不强制引入复杂 ML 基础设施。

### Search

D1 是权威数据源；Search Worker/Index 负责搜索、suggest、discovery。

搜索系统不得反向成为业务主数据的唯一权威源。

---

## 12. Observability Contract

Observability 是横向基础能力，不新增业务 Worker。

至少需要：

- request_id；
- trace_id（需要时）；
- request latency；
- error rate；
- shard/query/write latency；
- cache hit rate；
- fanout；
- retry/timeout；
- capacity/resource boundary。

没有可验证证据，不得声称“高并发”“先进”“低成本”已经被证明。

---

## 13. Code Minimization Contract

目标不是“代码越少越好”，而是：

**最少正确代码 + 最少重复 + 最少 RPC + 最少 D1 写入/查询 + 完整功能与安全边界。**

允许并鼓励：

- shared contracts；
- shared SDK；
- unified error；
- unified auth context；
- unified pagination；
- unified idempotency；
- generic data access primitives。

禁止：

- 为追求 30% 代码量而删功能；
- 删除测试；
- 删除错误处理；
- 删除权限；
- 删除恢复；
- 删除边界校验。

“30% 代码量”只能作为消除重复与无效复杂度的优化目标，不是功能削减指标。

---

## 14. Worker 独立部署合同

每一个可独立部署 Worker 必须拥有自己的：

```text
package.json
wrangler.toml / wrangler.jsonc
src/
tests/
README.md
```

禁止把所有 Worker 的依赖混入一个巨大的根目录 `package.json`。

目标：任何独立 Worker 在仓库中都能够独立安装、测试、构建、部署和回滚。

---

## 15. Change Manifest

每个任务实施前必须明确 Change Manifest：

- Task ID；
- 当前阶段；
- Owner；
- 允许修改目录；
- 允许新增/删除文件；
- 允许修改 API；
- 允许修改 Schema/Migration；
- 必须保持不变的 Contract；
- Verification；
- Commit 范围。

### Diff Scope Gate

提交前必须检查实际 Diff 是否完全落在 Change Manifest 内。

超出范围：**FAIL + STOP**。

不得用“顺便优化”“顺手重构”“以后会用到”解释越界修改。

---

## 16. AI 强制执行顺序

DeepSeek 必须严格执行以下顺序：

1. Read Contract
2. Read Repo
3. Read current implementation
4. Read Change Manifest
5. Confirm semantic Owner
6. Confirm allowed files/scope
7. Implement smallest complete change
8. Run relevant tests immediately
9. Fix failures
10. Retest
11. Boundary Audit
12. Diff Scope Gate
13. Commit
14. Push
15. CI verification
16. Only after PASS report COMPLETE

不得跳步。

不得在执行中自行改变架构。

不得提前实现未来阶段。

---

## 17. Verification Contract

最少必须执行：

```bash
npm ci
npm run typecheck
npm test
npm run build
```

具体 Worker 还必须执行其适用的：

- contract tests；
- integration tests；
- schema/migration tests；
- idempotency tests；
- API tests；
- boundary tests；
- D1 tests；
- E2E smoke；
- performance/benchmark（任务明确要求时）。

必须覆盖适用失败路径：

- 400
- 401
- 403
- 404
- 409
- 429
- 500
- timeout
- duplicate request
- partial failure
- invalid input
- expired request
- stale epoch
- D1 failure

“编译成功”不等于“任务完成”。

---

## 18. End-to-End Smoke Contract

第一版必须最终能够验证核心链路：

`Auth → User → Content Create → Media Reference → Publish → Feed Read → Content Read → Social Action → Search → Topic → History`

每个环节必须能够证明：

- API 可用；
- Owner 正确；
- 数据写入正确；
- 数据读取正确；
- 权限正确；
- 幂等正确；
- 错误可控；
- 关键链路可恢复。

---

## 19. Frontend Experience Contract

业务 API 必须支持统一前端状态：

- Loading；
- Empty；
- Error；
- Retry；
- Success；
- optimistic feedback（适用时）；
- cursor pagination；
- duplicate prevention；
- image/video loading/error；
- 核心交互反馈。

后端不得为了“接口简单”破坏前端一致性。

---

## 20. GitHub Branch / PR / CI Contract

推荐流程：

`feature branch → PR → CI → review → merge`

main 必须始终保持：

- buildable；
- testable；
- deployable；
- rollbackable。

CI 至少检查：

1. repository structure；
2. Worker package isolation；
3. typecheck；
4. unit tests；
5. integration tests；
6. API contract；
7. middleware/business boundary；
8. diff scope；
9. build；
10. schema/migration/D1（适用时）；
11. E2E smoke（适用时）。

CI FAIL：

- 禁止 merge；
- 禁止忽略失败；
- 禁止 skip test；
- 禁止关闭门禁；
- 禁止 force merge。

---

## 21. Commit / Push Contract

Commit 必须小、原子、可追踪。

Push 后必须提供：

- Commit SHA；
- CI result；
- changed files；
- test result；
- build result；
- 若适用：migration/schema/contract verification。

只有：

**PUSHED + CI PASS = VALID**

才允许标记本任务完成。

---

## 22. Phase Gate

每个阶段必须满足：

`Implementation → Verification → Boundary Audit → Diff Audit → CI PASS → Closure Evidence`

才可以进入下一阶段。

阶段未闭环时，不得以“代码已经差不多”进入下一任务。

---

## 23. Architecture Freeze Rule

架构一旦进入当前阶段执行，DeepSeek 不得在实现过程中重新路由任务、重新划分 Worker、重新定义 Owner 或改变 API/Schema Contract。

如果发现原合同存在真实缺陷：

1. STOP 当前越界修改；
2. 报告冲突；
3. 生成变更建议；
4. 经批准后更新 Contract；
5. 再继续实现。

**实施代理没有隐含架构决策权。**

---

## 24. Final Completion Definition

只有同时满足以下全部条件，任务才叫 COMPLETE：

- 功能实现；
- Contract 满足；
- Owner 正确；
- Middleware 无业务泄漏；
- API Contract 满足；
- Data Contract 满足；
- 安全与权限满足；
- 错误与恢复满足；
- 测试通过；
- Build 通过；
- Diff Scope 通过；
- CI PASS；
- GitHub Push 成功；
- Closure Evidence 完整。

任何一项缺失都只能标记为 `INCOMPLETE`。

---

## 25. AI 最终执行口令

> **不做架构决策。**
>
> **不扩大任务范围。**
>
> **不提前实现未来阶段。**
>
> **不创建第二个语义 Owner。**
>
> **不把业务代码放入 Middleware。**
>
> **不复制业务实现形成双 Owner。**
>
> **不修改 Contract 外的 API、Schema、文件和 Worker。**
>
> **不以编译成功代替完成。**
>
> **遇到冲突立即 STOP。**
>
> **只有所有 Verification、Boundary、Diff、CI、Push 门禁全部 PASS，才允许报告 COMPLETE。**

---

## 26. 适用范围

本合同适用于：

- D1-Fabric Middleware；
- B01–B21 Business Workers；
- API Contract；
- D1 Schema/Migration；
- Cloudflare Workers；
- DeepSeek/其他 AI 代码实施；
- GitHub commit/PR/CI/push；
- 后续阶段所有继承本合同的开发任务。

本合同优先于 AI 在单次任务中自行形成的临时方案。
