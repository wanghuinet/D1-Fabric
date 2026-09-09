# B01 今日头条 / 百度 APP 型业务 Schema + API 一体化设计 v1.0

> 状态：ACTIVE
> 日期：2026-09-09
> 前置：D1-Fabric 技术底座已完成
> 目标：一次冻结数据库字段、API、业务边界和 Worker 调用图，避免返工。

## 1. 蓝本与边界

本项目不复制任何公司私有实现，而以公开可观察的今日头条、百度 APP、百家号产品形态和公开工程实践为蓝本：统一内容模型、Feed、推荐、互动、创作者、搜索、多端 API。

技术底座已经完成。B01 起禁止重新开发 D1 Fabric、Shard、Router、通用 D1 调度、通用幂等、通用重试、通用 Trace 等基础设施。

Cloudflare Service Bindings/RPC 是 Worker 内部调用的首选方式。官方文档说明 Service Binding 不增加额外费用，但每次调用计入 subrequest；单请求 Worker invocation 上限为 32。因此目标不是“Worker 越多越先进”，而是“业务边界清晰 + 一次用户行为最少 Worker/RPC”。

## 2. 一体化设计顺序

任何业务功能必须按以下顺序一次完成：

```text
用户场景
→ 实体/字段
→ 唯一键/索引/状态
→ API Request/Response DTO
→ Worker ownership
→ RPC 调用图
→ D1 statement / rows read / rows write 预算
→ migration
→ implementation
→ integration test
```

禁止先写前端再补 API，禁止先写 Worker 再反推数据库。

## 3. 最小业务 Worker 拓扑

第一版：

```text
W07 API/BFF
W08 Identity
W09 Content
W10 Feed
W11 Interaction
W12 Social
W13 Search
```

不是每个请求都经过所有 Worker。

- W07：公开 `/api/v1/*`，请求解析、版本、最小聚合；不保存业务真相。
- W08：users、session、refresh。
- W09：posts、media metadata、发布状态。
- W10：feed/following/hot/recommendation contract。
- W11：likes、favorites、comments、interaction state。
- W12：follows、creator relationship。
- W13：search contract 和索引编排。

若两个 Worker 的调用高度频繁且合并明显减少 RPC，应合并；禁止为了形式上的微服务继续拆分。

## 4. Cloudflare 成本第一原则

目标调用路径：

```text
Client
 ↓
Public API Worker
 ↓
1 个主要业务 Worker
 ↓
必要时 1~2 次 Service Binding RPC
 ↓
D1-Fabric
```

禁止：

```text
API → Feed → User → Content → Stats → Social → Recommendation
```

这种链式调用增加 subrequest、延迟和故障面。

优先使用 Cloudflare 原生绑定：D1、KV、R2、Cache API、Service Bindings/RPC、Queues、Workflows。不要为了“全家桶”而强行使用；每项能力必须有实际业务收益。

- D1：业务关系数据和事务性真相。
- KV：低延迟、可容忍最终一致的全局缓存/配置。
- Cache：公共、可缓存响应。
- R2：图片、视频、头像、附件；D1 只存 object key/metadata。
- Queues：转码、索引同步、通知、计数等异步任务。
- Workflows：长流程、可恢复任务。

## 5. 第一版核心 Schema 冻结

### users

```text
id           INTEGER/ID64 PK
username     TEXT UNIQUE
nickname     TEXT
avatar_key   TEXT NULL
bio          TEXT NULL
status       INTEGER
created_at   INTEGER
updated_at   INTEGER
```

### posts

```text
id            INTEGER/ID64 PK
author_id     INTEGER
content_type  TEXT
text          TEXT NULL
status        INTEGER
visibility    INTEGER
created_at    INTEGER
updated_at    INTEGER
published_at  INTEGER NULL
```

`content_type`：`text | image | video | mixed`。

### post_media

```text
id           INTEGER/ID64 PK
post_id      INTEGER
media_type   TEXT
object_key   TEXT
width        INTEGER NULL
height       INTEGER NULL
duration_ms  INTEGER NULL
sort_order   INTEGER
created_at   INTEGER
```

### comments

```text
id          INTEGER/ID64 PK
post_id     INTEGER
author_id    INTEGER
parent_id    INTEGER NULL
text         TEXT
status       INTEGER
created_at   INTEGER
updated_at   INTEGER
```

第一版支持一级回复，不设计无限复杂评论树。

### likes

```text
user_id     INTEGER
post_id     INTEGER
created_at  INTEGER
PRIMARY KEY(user_id, post_id)
```

### favorites

```text
user_id     INTEGER
post_id     INTEGER
created_at  INTEGER
PRIMARY KEY(user_id, post_id)
```

### follows

```text
follower_id   INTEGER
following_id  INTEGER
created_at    INTEGER
PRIMARY KEY(follower_id, following_id)
```

## 6. 第一批索引

只围绕真实访问路径建立：

```text
posts(author_id, published_at, id)
posts(status, published_at, id)
comments(post_id, created_at, id)
follows(follower_id, following_id)
follows(following_id, follower_id)
```

点赞/收藏复合主键同时承担去重和用户状态查询。禁止提前建立大量低频索引。

## 7. 第一版 API Contract

### Identity

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/me
```

### Feed

```text
GET /api/v1/feed
GET /api/v1/feed/following
GET /api/v1/feed/hot
```

### Content

```text
POST   /api/v1/posts
GET    /api/v1/posts/:id
PATCH  /api/v1/posts/:id
DELETE /api/v1/posts/:id
GET    /api/v1/users/:id/posts
```

### Interaction

```text
POST   /api/v1/posts/:id/like
DELETE /api/v1/posts/:id/like
POST   /api/v1/posts/:id/favorite
DELETE /api/v1/posts/:id/favorite
GET    /api/v1/posts/:id/comments
POST   /api/v1/posts/:id/comments
POST   /api/v1/comments/:id/like
```

### Social

```text
POST   /api/v1/users/:id/follow
DELETE /api/v1/users/:id/follow
GET    /api/v1/users/:id
```

### Search

```text
GET /api/v1/search?q=&type=&cursor=
```

## 8. Feed 必须一次返回完整卡片

目标 DTO：

```json
{
  "items": [{
    "post": {"id":"...","content_type":"video","text":"..."},
    "author": {"id":"...","nickname":"...","avatar":"..."},
    "media": [],
    "stats": {"likes":0,"comments":0},
    "viewer": {"liked":false,"favorited":false,"following":false}
  }],
  "next_cursor":"...",
  "has_more":true
}
```

客户端不能知道这些字段来自多少次 D1 查询。

禁止：

```text
Feed → author API × N
     → media API × N
     → stats API × N
     → like API × N
```

正确方向是批量读取/聚合：

```text
candidate IDs
→ 批量 posts/authors/media
→ 批量 viewer interaction state
→ 一次返回 Feed DTO
```

宁可 Feed Worker 多写少量业务聚合代码，也不要制造大量 RPC。

## 9. 成本预算

### Feed

```text
1 public request
1 main business Worker
0~2 internal RPC
0 D1 write
最少 D1 reads
```

### Like

```text
1 public request
1 Interaction Worker
1 D1 write
```

### Follow

```text
1 public request
1 Social Worker
1 D1 write
```

### Comment

```text
1 public request
1 Interaction Worker
1 primary D1 write
```

### Publish

同步只做：

```text
validate → create post → create media references → return
```

转码、缩略图、搜索索引、通知等异步处理。

## 10. 最快上线策略

第一版不等待完整推荐算法。Feed 先采用：

```text
following recent posts
+ hot/recent posts
+ deterministic/simple ranking
```

先跑通：

```text
注册
→ 登录
→ Feed
→ 详情
→ 发布
→ 点赞
→ 评论
→ 关注
→ 再刷 Feed
```

之后替换推荐实现，但不修改客户端 API Contract。

## 11. API/Schema 不返工验收

每个 API 在开发前必须同时冻结：

```text
endpoint
request DTO
response DTO
error codes
auth rule
idempotency rule
D1 tables
D1 indexes
D1 statements
rows read
rows write
Worker RPC count
cache opportunity
async opportunity
```

若任一项不明确，不进入客户端开发。

新增需求若无法表达，必须先判断是：

1. 现有字段缺失；
2. 新实体；
3. 新关系；
4. 派生数据；
5. 缓存数据；
6. 异步事件。

只有业务真相确实需要持久化，才能增加 D1 schema。

## 12. 当前立即执行

```text
B01.1 Schema 冻结
B01.2 API DTO 冻结
B01.3 Worker RPC Contract 冻结
B01.4 OpenAPI
B01.5 migrations
B01.6 API Worker skeleton
B01.7 Identity
B01.8 Content
B01.9 Feed
B01.10 Interaction
B01.11 Social
B01.12 Search Contract
B01.13 Integration tests
B01.14 Worker/RPC/D1 成本验收
```

完成后浏览器、Android、iOS 使用完全相同的 `/api/v1`，可以立即并行开发。

**核心结论：Schema、API、Worker ownership、Cloudflare RPC 图必须一次性联合设计；前端不能反向修改后端架构。**