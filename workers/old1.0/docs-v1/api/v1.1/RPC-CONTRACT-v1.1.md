# RPC Contract v1.1 — API-First MVP

## Physical Workers

```text
W07 API/BFF
W08 Identity
W09 Content + Media + Topic
W10 Feed + Recommendation + History
W12 Social + Interaction
W13 Search
```

Clients call W07 only. Business Workers communicate through Service Bindings/RPC. W01-W06 remain the generic D1-Fabric infrastructure.

## RPC surface

### W08 Identity
- `getUser(userId)`
- `getMe(context)`
- `register(input, context)`
- `login(input, context)`
- `refresh(input, context)`
- `logout(context)`

### W09 Content
- `createPost(input, context)`
- `getPost(postId, context)`
- `updatePost(postId, input, context)`
- `deletePost(postId, context)`
- `listPostsByAuthor(userId, cursor, limit, context)`
- `publishPost(postId, context)`
- `schedulePost(postId, input, context)`
- `unpublishPost(postId, context)`
- `archivePost(postId, context)`
- `listDrafts(cursor, limit, context)`
- `listScheduled(cursor, limit, context)`
- `authorizeMediaUpload(input, context)`
- `getTopic(topicId, context)`
- `listTopicPosts(topicId, cursor, limit, context)`
- `listComments(postId, cursor, limit, context)`
- `createComment(postId, input, context)`
- `listHistory(context, cursor, limit)`
- `recordHistoryEvent(input, context)`

### W10 Feed
- `getFeed(mode, cursor, limit, context)`

Mode: `home | following | hot`.

Feed enrichment must be batch-oriented; no per-item RPC.

### W12 Social / Interaction
- `setLike(postId, enabled, context)`
- `setFavorite(postId, enabled, context)`
- `setFollow(userId, enabled, context)`
- `setCommentLike(commentId, enabled, context)`
- `getViewerStates(postIds, context)`

### W13 Search
- `search(query, type, cursor, limit, context)`

## RPC rules

- Normal read paths target no more than two internal RPC hops.
- Interaction writes target one business RPC plus one primary write.
- Search targets one business RPC.
- No per-feed-item RPC.
- Context and deadline propagate end-to-end.
- Idempotency keys propagate to retryable writes.
- Errors use the common error contract.
- Future adapters do not become business RPCs until a versioned contract activates them.
