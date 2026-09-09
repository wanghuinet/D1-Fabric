PRAGMA foreign_keys = ON;

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

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('text','image','video','mixed')),
  text TEXT,
  status INTEGER NOT NULL DEFAULT 1,
  visibility INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE post_media (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image','video','audio','file')),
  object_key TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

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

CREATE INDEX idx_posts_author_published_id ON posts(author_id, published_at, id);
CREATE INDEX idx_posts_status_published_id ON posts(status, published_at, id);
CREATE INDEX idx_comments_post_created_id ON comments(post_id, created_at, id);
CREATE INDEX idx_follows_follower_following ON follows(follower_id, following_id);
CREATE INDEX idx_follows_following_follower ON follows(following_id, follower_id);
