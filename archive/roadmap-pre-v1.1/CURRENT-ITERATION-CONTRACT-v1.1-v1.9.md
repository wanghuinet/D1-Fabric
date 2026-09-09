# Archived: CURRENT-ITERATION-CONTRACT-v1.1-v1.9

**Status:** SUPERSEDED / NO ACTIVE AUTHORITY
**Superseded by:** `docs/PRODUCT-PLATFORM-ROADMAP-CONTRACT-v1.0.md`
**Archived:** 2026-09-09

This file records the former version-first roadmap contract. Its core decisions are retained for audit history, but it is no longer an implementation authority.

Former model:

```text
v1.1 Content distribution MVP
→ v1.2 Social completion
→ v1.3 Creator platform
→ v1.4 Discovery
→ v1.5 Recommendation
→ v1.6 Media expansion
→ v1.7 Platform operations
→ v1.8 AI
→ v1.9 Ecosystem
```

Former v1.1 scope included Auth/User, text/image/video/mixed content, R2 media, lifecycle publishing, home/following/hot feeds, detail, like/favorite/follow, comments/replies, search/topic/history primitives, Admin, public H5, Android and developer API.

Former cost laws included cache hit → 0 D1, normal read → ideally 1 D1, primary write → ideally 1 write, asynchronous side effects, no per-item RPC and no unbounded scans.

Former architecture rules retained in active contracts include generic W01-W06 middleware, business ownership outside middleware, one canonical post model, R2 binary ownership, one comments model with `parent_id`, and authoritative idempotency constraints.

The detailed historical source remains recoverable from Git history. Do not use this file to authorize new implementation work.
