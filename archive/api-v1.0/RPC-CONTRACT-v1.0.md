# Business Worker RPC Contract v1.0

状态：FROZEN  
版本：1.0.0

## Worker ownership

- W07 API/BFF: public `/api/v1/*`; request/version/auth context and minimal aggregation only.
- W08 Identity: users, sessions, refresh lifecycle.
- W09 Content: posts and post_media.
- W10 Feed: feed candidates, feed aggregation and ranking contract.
- W11 Interaction: likes, favorites, comments and viewer interaction state.
- W12 Social: follows and relationship state.
- W13 Search: search contract and indexing orchestration.

## Rules

1. Client calls W07 only.
2. Business Workers communicate only through Service Binding/RPC contracts; no public HTTP between business Workers.
3. A Worker never reads another Worker's private data implementation directly.
4. Prefer one primary Worker per request and at most two internal RPC calls on normal read paths.
5. No RPC fan-out per feed item. Batch IDs and return aggregated DTOs.
6. No synchronous RPC for work that can be queued: media processing, search indexing, notifications and non-critical counters.
7. W07 does not become a business-data owner.
8. W01-W06 remain technical infrastructure and are not modified for business features.

## Frozen methods

### W08 Identity

`getUser(id) -> UserDTO`  
`getMe(subject) -> UserDTO`  
`register(input) -> AuthResponse`  
`login(input) -> AuthResponse`  
`refresh(refreshToken) -> AuthResponse`  
`logout(subject) -> void`

### W09 Content

`createPost(subject, input) -> PostDTO`  
`getPost(id) -> PostDetailDTO`  
`updatePost(subject, id, input) -> PostDTO`  
`deletePost(subject, id) -> void`  
`listPostsByAuthor(authorId, cursor, limit) -> FeedResponse`

### W10 Feed

`getFeed(subject|null, mode, cursor, limit) -> FeedResponse`

`mode`: `home | following | hot`.

Feed Worker owns aggregation. It may request batched user/content/interaction data, but never one RPC per item.

### W11 Interaction

`setLike(subject, postId, active) -> InteractionState`  
`setFavorite(subject, postId, active) -> InteractionState`  
`listComments(postId, cursor, limit) -> CommentListResponse`  
`createComment(subject, postId, input) -> CommentDTO`  
`setCommentLike(subject, commentId, active) -> void`  
`getViewerStates(subject, postIds[]) -> ViewerStateMap`

### W12 Social

`setFollow(subject, targetUserId, active) -> FollowState`  
`getFollowingStates(subject, userIds[]) -> map<userId,boolean>`

### W13 Search

`search(subject|null, q, type, cursor, limit) -> SearchResponse`

## RPC budgets

| Public operation | Primary | Max internal RPC | D1 writes target |
|---|---|---:|---:|
| register/login/refresh/logout/me | W08 | 0 | 0-1 |
| post create/update/delete/detail | W09 | 0-1 | 0-2 |
| feed/home/following/hot | W10 | 0-2 | 0 |
| like/favorite/comment | W11 | 0-1 | 1 primary |
| follow | W12 | 0-1 | 1 |
| search | W13 | 0-1 | 0 |

These are acceptance budgets, not permission to add calls. If a route can finish with fewer calls, fewer calls is mandatory.

## Contract evolution

v1 is frozen. Additive changes require a new contract version or an explicitly backward-compatible field. Removing/renaming fields, changing meaning, changing ownership, or changing D1 key semantics is a breaking change and cannot be made inside v1.
