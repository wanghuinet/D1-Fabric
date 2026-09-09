PRAGMA foreign_keys = ON;

-- Canonical identity
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  avatar_key TEXT,
  bio TEXT,
  status INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE user_identities (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_user_identities_user ON user_identities(user_id);

-- Locale / manual translation primitives
CREATE TABLE locales (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fallback_locale TEXT,
  direction TEXT NOT NULL DEFAULT 'ltr' CHECK (direction IN ('ltr','rtl')),
  enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (fallback_locale) REFERENCES locales(code)
);

CREATE TABLE translation_groups (
  id INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Core content
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL,
  translation_group_id INTEGER,
  content_type TEXT NOT NULL CHECK (content_type IN ('text','image','video','mixed')),
  text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','scheduled','published','archived')),
  visibility INTEGER NOT NULL DEFAULT 1,
  publish_at INTEGER,
  published_at INTEGER,
  unpublish_at INTEGER,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (translation_group_id) REFERENCES translation_groups(id)
);
CREATE INDEX idx_posts_author_status_time_id ON posts(author_id, status, published_at, id);
CREATE INDEX idx_posts_status_time_id ON posts(status, published_at, id);

CREATE TABLE post_translations (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  locale_code TEXT NOT NULL,
  text TEXT,
  translation_status TEXT NOT NULL DEFAULT 'draft' CHECK (translation_status IN ('draft','published','stale')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(post_id, locale_code),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (locale_code) REFERENCES locales(code)
);
CREATE INDEX idx_post_translations_locale_post ON post_translations(locale_code, post_id);

CREATE TABLE media (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video','audio','file')),
  object_key TEXT NOT NULL UNIQUE,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE post_media (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  media_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(post_id, media_id),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (media_id) REFERENCES media(id)
);
CREATE INDEX idx_post_media_post_order ON post_media(post_id, sort_order, id);

-- Comments / interaction
CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  parent_id INTEGER,
  text TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES comments(id)
);
CREATE INDEX idx_comments_post_created_id ON comments(post_id, created_at, id);

CREATE TABLE comment_translations (
  id INTEGER PRIMARY KEY,
  comment_id INTEGER NOT NULL,
  locale_code TEXT NOT NULL,
  text TEXT NOT NULL,
  translation_status TEXT NOT NULL DEFAULT 'draft' CHECK (translation_status IN ('draft','published','stale')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(comment_id, locale_code),
  FOREIGN KEY (comment_id) REFERENCES comments(id),
  FOREIGN KEY (locale_code) REFERENCES locales(code)
);

CREATE TABLE likes (
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE favorites (
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE follows (
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id),
  FOREIGN KEY (following_id) REFERENCES users(id)
);
CREATE INDEX idx_follows_following_follower ON follows(following_id, follower_id);

-- Content discovery primitives
CREATE TABLE hashtags (
  id INTEGER PRIMARY KEY,
  tag TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE content_hashtags (
  post_id INTEGER NOT NULL,
  hashtag_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, hashtag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (hashtag_id) REFERENCES hashtags(id)
);
CREATE INDEX idx_content_hashtags_hashtag_post ON content_hashtags(hashtag_id, post_id);

CREATE TABLE mentions (
  post_id INTEGER NOT NULL,
  mentioned_user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, mentioned_user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (mentioned_user_id) REFERENCES users(id)
);

CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  collection_type TEXT NOT NULL CHECK (collection_type IN ('collection','board','playlist','series')),
  name TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE collection_items (
  collection_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (collection_id, post_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

CREATE TABLE topics (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE topic_contents (
  topic_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (topic_id, post_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);
CREATE INDEX idx_topic_contents_post_topic ON topic_contents(post_id, topic_id);

CREATE TABLE content_schedules (
  post_id INTEGER PRIMARY KEY,
  publish_at INTEGER NOT NULL,
  unpublish_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- Minimum MVP history: content-view history. Other history types remain B13 extensions.
CREATE TABLE content_views (
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  last_viewed_at INTEGER NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (post_id) REFERENCES posts(id)
);
CREATE INDEX idx_content_views_user_time ON content_views(user_id, last_viewed_at DESC, post_id DESC);
