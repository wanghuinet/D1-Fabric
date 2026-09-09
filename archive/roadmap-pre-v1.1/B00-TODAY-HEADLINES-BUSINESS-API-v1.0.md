# B00 今日头条业务层与 API 无头基座规范 v1.0

> 状态：ACTIVE
> 生效日期：2026-09-09
> 范围：仅业务层
> 技术底座：已完成，禁止重复开发

## 0. 总原则

从本版本开始，D1-Fabric 技术底座视为已完成。后续开发全部进入“今日头条型内容平台业务层”。

业务代码不得重新实现或复制技术底座能力。业务 Worker 只负责业务规则、业务数据模型、业务 API 编排与业务事件。

核心目标：

1. 最少代码实现完整业务能力。
2. API First / Headless First。
3. 浏览器、Android、iOS 全部作为 API Consumer。
4. 同一套业务 API、同一套鉴权语义、同一套错误码、同一套分页与数据契约。
5. 前端不直接访问 D1，不知道分片，不知道 Worker 拓扑。
6. 业务 Worker 不实现 D1 Fabric 能力。
7. 先完成 API 无头基座，再并行开发 Web / Android / iOS。
8. 一个业务能力只实现一次，禁止 Web、Android、iOS 各写一套后端逻辑。

---

## 1. 明确剔除：不得再开发技术底座

以下均视为已有能力，业务阶段禁止重新设计、复制或迁移：

- Cloudflare Worker 运行时基础能力
- D1 Fabric
- 分片与路由
- 数据访问抽象
- D1 查询/写入调度
- 全局 ID
- 幂等
- 重试、超时、熔断
- Trace / 日志基础设施
- 通用安全边界
- 通用 API Gateway / 基础路由能力
- 通用响应包装
- 通用错误处理
- 通用 CORS
- 通用版本机制

若业务代码需要上述能力，只能调用现有底座接口，不得重新实现。

---

## 2. API 无头基座的定位

这里的“API 无头基座”不是重新开发技术底座，而是建立在现有 D1-Fabric 之上的“业务 API Contract Layer”。

它负责把业务能力稳定地暴露给所有客户端：

```text
Web Browser
      \
Android App ----> Business API ----> Business Workers ----> D1-Fabric
      /
 iOS App
```

API 层只做业务入口、业务参数校验、业务授权、业务编排、业务 DTO/响应，不承担数据库基础设施职责。

---

## 3. API 设计原则

### 3.1 REST + JSON

默认使用 HTTPS + JSON。

统一前缀：

```text
/api/v1
```

资源型接口优先使用 REST 语义；复杂首页/推荐流允许使用专用 Query API，以减少客户端请求次数。

### 3.2 Client Agnostic

API 不区分 Web / Android / iOS 的业务实现。

允许通过 header 提供客户端信息，但不能因此产生三套业务逻辑。

### 3.3 稳定 DTO

数据库表结构永远不是客户端 Contract。

API 输出 DTO 与内部数据模型解耦，避免数据库结构变化导致客户端大规模修改。

### 3.4 少请求优先

以“用户一次主要操作”为单位设计 API，而不是机械地一表一个接口。

首页信息流原则上通过一次 API 返回首屏所需的聚合数据，避免客户端产生 N+1 请求。

---

## 4. 第一阶段必须完成的 API Contract

第一阶段只完成能支撑完整 APP 主循环的最小业务闭环，不提前实现全部高级功能。

### 4.1 Identity

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/me
```

### 4.2 Feed

```text
GET /api/v1/feed
GET /api/v1/feed/following
GET /api/v1/feed/hot
```

推荐首页的首要接口为 `/feed`。

返回：

- 内容基础信息
- 作者摘要
- 媒体资源摘要
- 推荐理由/轻量 ranking metadata（客户端无需理解算法）
- 互动计数
- 当前用户互动状态
- 下一页 cursor

### 4.3 Content

```text
GET  /api/v1/posts/:id
POST /api/v1/posts
PATCH /api/v1/posts/:id
DELETE /api/v1/posts/:id
```

内容类型第一阶段统一抽象为：

```text
text
image
video
mixed
```

避免为图文、视频、动态分别复制整套业务模型。

### 4.4 Interaction

```text
POST   /api/v1/posts/:id/like
DELETE /api/v1/posts/:id/like
POST   /api/v1/posts/:id/favorite
DELETE /api/v1/posts/:id/favorite
POST   /api/v1/posts/:id/comments
GET    /api/v1/posts/:id/comments
POST   /api/v1/comments/:id/like
```

互动必须具备幂等语义，底座负责通用幂等能力，业务层只声明业务唯一键/操作语义。

### 4.5 Follow

```text
POST   /api/v1/users/:id/follow
DELETE /api/v1/users/:id/follow
GET    /api/v1/users/:id
GET    /api/v1/users/:id/posts
```

### 4.6 Search

第一阶段只建立业务 Contract：

```text
GET /api/v1/search?q=&type=&cursor=
```

搜索实现可以后置，但 API Contract 不应绑定具体搜索引擎。

---

## 5. Feed 是第一业务核心

今日头条型产品的第一业务闭环：

```text
打开 APP
 -> Feed
 -> 阅读内容
 -> 点赞/收藏/评论
 -> 关注作者
 -> 返回 Feed
 -> 推荐结果逐渐变化
```

第一阶段不要同时开发直播、商城、复杂创作者中心、广告平台、游戏等非核心系统。

先把这个闭环做到可运行、可测试、可扩展。

---

## 6. Feed API 返回结构原则

推荐使用 cursor pagination，不使用 page/offset 作为主分页机制。

示意：

```json
{
  "data": {
    "items": [],
    "next_cursor": "...",
    "has_more": true
  },
  "request_id": "..."
}
```

`request_id`、错误结构、基础 envelope 等由已有通用 API 能力统一处理；业务代码不得重复实现。

Feed item 应尽量一次返回客户端首屏需要的信息，避免：

```text
feed -> author API -> stats API -> like API -> media API
```

形成串行请求链。

目标：

```text
feed -> 一次业务 API -> 完成首屏渲染
```

---

## 7. 业务 Worker 最小划分

不要按数据库表创建 Worker，也不要为了“微服务化”制造大量 Worker。

初始只按稳定业务边界划分：

### W07 Identity

负责账号、会话、用户基础资料。

### W08 Content

负责内容发布、读取、编辑、删除、作者内容列表。

### W09 Feed

负责首页 Feed、关注 Feed、热门 Feed 的业务编排与推荐入口。

### W10 Interaction

负责点赞、收藏、评论、互动状态。

### W11 Social

负责关注关系、用户关系类业务。

### W12 Search

负责搜索业务 Contract 与搜索编排。

> Worker 数量不是目标。若两个边界长期高度耦合、调用成本明显高于拆分收益，可以合并。禁止为了形式上的“一个功能一个 Worker”继续拆分。

---

## 8. Worker 边界规则

业务 Worker 可以调用其他业务 Worker，但必须通过稳定的业务 Contract。

禁止：

- Worker 之间直接读取对方数据库表。
- Worker 之间共享业务私有实现。
- 为一次简单页面产生多次 Worker RPC。
- 为了复用几行代码创建新的 Worker。
- 把技术底座代码复制到业务 Worker。

优先：

```text
API -> 一个业务 Worker -> 必要的最少内部调用 -> D1-Fabric
```

如果一次 API 可以通过一次业务编排完成，就不要制造多个客户端请求。

---

## 9. 数据模型最小化原则

业务数据只存真正需要持久化的数据。

不要为了未来可能需要的功能提前建立大量字段、表和索引。

核心实体优先：

```text
users
posts
media
comments
likes
favorites
follows
```

推荐系统、通知、审核、广告等后续能力可以通过事件和扩展表逐步增加。

不要把所有功能一次性塞进 users/posts 表。

---

## 10. D1 成本约束

业务开发继续遵循：

```text
Cache first
Read once
Write once
Batch when possible
Stop after cache hit
```

重点路径目标：

### Feed

尽可能：

```text
1 API
1 业务编排
最少 D1 reads
0 D1 writes
```

### Like

```text
1 API
1 write
必要时最少计数更新
```

### Comment

```text
1 API
1 primary write
必要的最小附带写入
```

### Follow

```text
1 API
1 relationship write
```

具体 statement / rows read / rows write 必须在每个业务 Contract 完成后实测，而不是凭感觉估算。

---

## 11. API 与客户端开发顺序

严格采用：

```text
Phase B00  API Contract
Phase B01  Identity API
Phase B02  Content API
Phase B03  Feed API
Phase B04  Interaction API
Phase B05  Social API
Phase B06  Search API
Phase B07  API 集成验收
Phase B08  Web Client
Phase B09  Android Client
Phase B10  iOS Client
```

Web / Android / iOS 可以在 API Contract 稳定后并行开发。

不要先分别开发三个客户端再倒推 API。

---

## 12. API Contract 完成标准

一个业务 API 只有同时满足以下条件才算完成：

1. OpenAPI/接口契约明确。
2. 请求参数明确。
3. 响应 DTO 明确。
4. 错误码明确。
5. 鉴权要求明确。
6. 幂等语义明确。
7. cursor 分页规则明确（如适用）。
8. D1-Fabric 调用路径明确。
9. 最大 Worker / RPC 数量明确。
10. D1 statement / rows read / rows write 有测试证据。
11. 至少覆盖正常、重复请求、权限失败、资源不存在、边界参数。
12. Web / Android / iOS 均能使用同一 Contract。

---

## 13. “最少代码”规则

业务实现优先级：

```text
已有底座能力 > 现有业务模块复用 > 小型纯函数 > 新抽象 > 新 Worker
```

只有业务边界真正需要时才增加抽象。

禁止：

- 过度设计 Repository/Service/Factory/Adapter 层。
- 为几十行业务逻辑创建多层目录。
- 重复 DTO 转换。
- 重复鉴权。
- 重复错误处理。
- 重复数据库访问封装。
- 复制代码解决不同客户端需求。

目标不是“代码越少越好”，而是**在不牺牲正确性、可测试性、安全性和可维护性的前提下，删除所有非必要代码**。

---

## 14. 前端无头原则

业务 API 完成后：

```text
Web = API Client
Android = API Client
iOS = API Client
```

客户端不拥有业务真相。

例如点赞：

```text
Client -> POST /posts/:id/like
```

而不是客户端自行修改点赞计数并假设成功。

API 返回最终业务状态，客户端只负责展示与交互体验。

---

## 15. AI 开发约束

DeepSeek 等 AI 开发者必须遵守：

1. 先读取本文件及现有 C00/C01/C02。
2. 先检查现有技术底座能力，再写业务代码。
3. 禁止重新开发技术底座。
4. 禁止自行增加 Worker，除非业务边界确实需要并有明确理由。
5. 禁止修改已完成的 D1-Fabric 核心实现来适配业务。
6. 一个阶段一次完成 Contract + Schema + Worker + Test + Evidence。
7. 开发前先列出受影响文件与 API，不得自行改变整体架构。
8. 完成后必须运行测试和业务路径验证。
9. 发现问题优先修复业务代码，不得通过修改底座逃避业务边界问题。
10. 完成一个阶段后更新状态文档，再进入下一阶段。

---

## 16. 第一公里：现在真正应该开发什么

技术底座已经完成，因此下一步不是继续做 Axx 技术任务，而是直接进入：

```text
B00 API Contract
    ↓
B01 Identity
    ↓
B02 Content
    ↓
B03 Feed
    ↓
B04 Interaction
    ↓
B05 Social
    ↓
B06 Search
```

其中 **B00 必须先完成**，因为它决定 Web、Android、iOS 后续是否可以真正共享一套后端。

---

## 17. 最终目标架构

```text
                    ┌──────────────┐
                    │ Web Browser  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Business API │
                    │  /api/v1     │
                    └──────┬───────┘
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
 ┌─────▼─────┐       ┌─────▼─────┐      ┌─────▼─────┐
 │ Identity  │       │   Feed    │      │  Content  │
 └─────┬─────┘       └─────┬─────┘      └─────┬─────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼───────┐
                    │  D1-Fabric   │
                    │ 技术底座     │
                    └──────────────┘

Android / iOS 使用完全相同的 Business API。
```

技术底座是稳定基础设施；业务层是唯一持续迭代区域。

---

## 18. Definition of Done

B00 完成后必须达到：

- API version 固定为 v1。
- 核心资源命名统一。
- Auth 语义统一。
- Error Contract 统一。
- Cursor Pagination 统一。
- DTO 规范统一。
- Web/Android/iOS 均可直接依据 Contract 开发。
- 不依赖具体客户端实现。
- 不包含任何新的技术底座实现。

**B00 完成后立即进入 B01，不再回头开发技术底座。**
