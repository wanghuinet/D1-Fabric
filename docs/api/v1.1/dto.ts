export type ContentType = 'text' | 'image' | 'video' | 'mixed';
export type MediaType = 'image' | 'video' | 'audio' | 'file';
export type PostStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'updated' | 'archived';

export interface UserDTO { id: string; username: string; nickname: string; avatar: string | null; bio: string | null; status: number; }
export interface RegisterRequest { username: string; password: string; nickname: string; }
export interface LoginRequest { username: string; password: string; }
export interface RefreshRequest { refresh_token: string; }
export interface AuthResponse { access_token: string; refresh_token: string; user: UserDTO; }

export interface MediaDTO { id: string; media_type: MediaType; object_key: string; width: number | null; height: number | null; duration_ms: number | null; sort_order: number; }
export interface MediaInput { media_type: MediaType; object_key: string; width?: number | null; height?: number | null; duration_ms?: number | null; sort_order?: number; }
export interface UploadAuthorizationRequest { media_type: MediaType; content_length?: number; content_type?: string; }
export interface UploadAuthorizationResponse { object_key: string; upload_url: string; expires_at: number; }

export interface PostDTO { id: string; author_id: string; content_type: ContentType; text: string | null; status: PostStatus; visibility: number; created_at: number; updated_at: number; publish_at: number | null; published_at: number | null; unpublish_at: number | null; }
export interface PostDetailDTO extends PostDTO { author: UserDTO; media: MediaDTO[]; }
export interface CreatePostRequest { content_type: ContentType; text?: string | null; media?: MediaInput[]; }
export interface UpdatePostRequest { text?: string | null; visibility?: number; }
export interface SchedulePostRequest { publish_at: number; unpublish_at?: number | null; }

export interface FeedItemDTO { post: PostDTO; author: UserDTO; media: MediaDTO[]; stats: { likes: number; comments: number }; viewer: { liked: boolean; favorited: boolean; following: boolean; }; }
export interface FeedResponse { items: FeedItemDTO[]; next_cursor: string | null; has_more: boolean; }
export interface CommentDTO { id: string; post_id: string; author_id: string; parent_id: string | null; text: string; status: number; created_at: number; updated_at: number; }
export interface CreateCommentRequest { text: string; parent_id?: string | null; }
export interface CommentListResponse { items: CommentDTO[]; next_cursor: string | null; has_more: boolean; }
export interface InteractionState { liked: boolean; favorited: boolean; }
export interface FollowState { following: boolean; }
export interface TopicDTO { id: string; name: string; description: string | null; }
export interface HistoryEventRequest { content_id: string; event_type: 'view' | 'search' | 'like' | 'share' | 'watch_progress'; progress_ms?: number | null; }
export interface HistoryItemDTO { id: string; content_id: string; event_type: string; created_at: number; progress_ms: number | null; }
export interface HistoryResponse { items: HistoryItemDTO[]; next_cursor: string | null; has_more: boolean; }
export interface SearchResponse { items: FeedItemDTO[]; next_cursor: string | null; has_more: boolean; }
export interface ApiError { code: string; message: string; request_id?: string; }
