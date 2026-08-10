import { env } from "cloudflare:workers";

let initialization: Promise<void> | null = null;

export function getD1(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export function getMediaBucket(): R2Bucket {
  if (!env.MEDIA) throw new Error("R2 binding MEDIA is unavailable");
  return env.MEDIA;
}

export async function ensureDatabase() {
  initialization ??= initialize(getD1()).catch((error) => {
    initialization = null;
    throw error;
  });
  return initialization;
}

async function initialize(db: D1Database) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, phone TEXT, phone_verified_at TEXT, display_name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, bio TEXT NOT NULL DEFAULT '', avatar_url TEXT, role TEXT NOT NULL DEFAULT 'member', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '', media_url TEXT, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id), author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), storage_key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS library_entries (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, body TEXT NOT NULL, source_url TEXT, media_url TEXT, status TEXT NOT NULL DEFAULT 'pending', reviewer_note TEXT NOT NULL DEFAULT '', reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS exhibitions (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, summary TEXT NOT NULL, curatorial_statement TEXT NOT NULL, external_url TEXT, cover_url TEXT, status TEXT NOT NULL DEFAULT 'pending', reviewer_note TEXT NOT NULL DEFAULT '', reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_actions (id TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES users(id), entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE INDEX IF NOT EXISTS posts_status_created_idx ON posts(status, created_at)`,
    `CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS library_status_category_idx ON library_entries(status, category)`,
    `CREATE INDEX IF NOT EXISTS exhibitions_status_created_idx ON exhibitions(status, created_at)`,
    `CREATE INDEX IF NOT EXISTS admin_actions_entity_idx ON admin_actions(entity_type, entity_id)`,
  ];
  await db.batch(statements.map((sql) => db.prepare(sql)));
  await ensureUserProfileColumns(db);
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users(phone)").run();

  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO users (id,email,display_name,username,role) VALUES ('seed-editor','editor@sundayservice.cn','SS/CN 编辑部','ssc-editor','admin')`),
    db.prepare(`INSERT OR IGNORE INTO posts (id,author_id,title,body,tags,status) VALUES ('seed-kendrick','seed-editor','你会如何排列 Kendrick Lamar 的五张录音室专辑？','从叙事、制作和重听价值三个维度重新排列。欢迎给出你的版本与理由。','Kendrick Lamar,专辑讨论','published')`),
    db.prepare(`INSERT OR IGNORE INTO posts (id,author_id,title,body,tags,status) VALUES ('seed-gospel-club','seed-editor','第一次把 Gospel 和 Jersey Club 放在同一首歌里','这是 90 秒版本，想听听大家对鼓组和人声空间的意见。','原创作品,Demo','published')`),
    db.prepare(`INSERT OR IGNORE INTO library_entries (id,owner_id,category,title,summary,body,status) VALUES ('seed-choir','seed-editor','课程','Gospel Choir：声部、律动与现场','从 Soprano、Alto、Tenor 的关系开始理解合唱编排。','包含六个入门章节的编辑课程。','approved')`),
    db.prepare(`INSERT OR IGNORE INTO library_entries (id,owner_id,category,title,summary,body,status) VALUES ('seed-yandhi','seed-editor','档案','Yandhi：未发行版本与时间线','整理公开流传版本、录音时间线与相关资料来源。','仅收录可公开引用的资料说明。','approved')`),
    db.prepare(`INSERT OR IGNORE INTO exhibitions (id,owner_id,title,summary,curatorial_statement,external_url,status) VALUES ('seed-pablo-king','seed-editor','从 The Life of Pablo 到 Jesus Is King','歌词、采样与福音叙事的对照研究','通过两个时期的作品观察 Kanye West 对信仰、家庭和公共表达的处理。','https://example.com/exhibition/pablo-king','approved')`),
  ]);
}

async function ensureUserProfileColumns(db: D1Database) {
  const info = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  const columns = new Set(info.results.map((column) => column.name));
  const additions = [
    ["phone", "ALTER TABLE users ADD COLUMN phone TEXT"],
    ["phone_verified_at", "ALTER TABLE users ADD COLUMN phone_verified_at TEXT"],
    ["avatar_url", "ALTER TABLE users ADD COLUMN avatar_url TEXT"],
  ] as const;
  for (const [name, sql] of additions) {
    if (!columns.has(name)) await db.prepare(sql).run();
  }
}
