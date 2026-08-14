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
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, phone TEXT, phone_verified_at TEXT, display_name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, bio TEXT NOT NULL DEFAULT '', avatar_url TEXT, password_hash TEXT, role TEXT NOT NULL DEFAULT 'member', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '', media_url TEXT, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id), author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), storage_key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS library_entries (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, body TEXT NOT NULL, source_url TEXT, media_url TEXT, status TEXT NOT NULL DEFAULT 'pending', reviewer_note TEXT NOT NULL DEFAULT '', reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS exhibitions (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, summary TEXT NOT NULL, curatorial_statement TEXT NOT NULL, external_url TEXT, cover_url TEXT, status TEXT NOT NULL DEFAULT 'pending', reviewer_note TEXT NOT NULL DEFAULT '', reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_actions (id TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES users(id), entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sms_codes (id TEXT PRIMARY KEY, phone TEXT, email TEXT, channel TEXT NOT NULL DEFAULT 'phone', code TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT NOT NULL, last_seen_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS site_assets (key TEXT PRIMARY KEY, url TEXT NOT NULL, alt TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS auth_attempts (id TEXT PRIMARY KEY, kind TEXT NOT NULL, account_key TEXT NOT NULL, fail_count INTEGER NOT NULL DEFAULT 0, last_fail_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS auth_attempts_kind_key_idx ON auth_attempts(kind, account_key)`,
    `CREATE TABLE IF NOT EXISTS rate_limits (id TEXT PRIMARY KEY, scope TEXT NOT NULL, scope_key TEXT NOT NULL, window_start TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_scope_key_idx ON rate_limits(scope, scope_key)`,
    `CREATE INDEX IF NOT EXISTS sms_codes_phone_idx ON sms_codes(phone, created_at)`,
    `CREATE INDEX IF NOT EXISTS sms_codes_email_idx ON sms_codes(email, created_at)`,
    `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS posts_status_created_idx ON posts(status, created_at)`,
    `CREATE INDEX IF NOT EXISTS comments_post_idx ON comments(post_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS library_status_category_idx ON library_entries(status, category)`,
    `CREATE INDEX IF NOT EXISTS exhibitions_status_created_idx ON exhibitions(status, created_at)`,
    `CREATE INDEX IF NOT EXISTS admin_actions_entity_idx ON admin_actions(entity_type, entity_id)`,
  ];
  await db.batch(statements.map((sql) => db.prepare(sql)));
  await ensureUserProfileColumns(db);
  await ensureSmsCodeColumns(db);
  await ensureContentBlocksColumns(db);
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users(phone)").run();

  // 本地开发播种：仅在非生产环境写入，且一律 member 角色，绝不创建内置管理员。
  // 生产环境管理员通过 ADMIN_EMAILS 环境变量白名单提升（见 app/lib/auth.ts）。
  if (process.env.NODE_ENV !== "production") {
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO users (id,email,display_name,username,role) VALUES ('seed-editor','editor@sundayservice.cn','SS/CN 编辑部','ssc-editor','member')`),
      db.prepare(`INSERT OR IGNORE INTO posts (id,author_id,title,body,tags,status) VALUES ('seed-kendrick','seed-editor','你会如何排列 Kendrick Lamar 的五张录音室专辑？','从叙事、制作和重听价值三个维度重新排列。欢迎给出你的版本与理由。','Kendrick Lamar,专辑讨论','published')`),
      db.prepare(`INSERT OR IGNORE INTO posts (id,author_id,title,body,tags,status) VALUES ('seed-gospel-club','seed-editor','第一次把 Gospel 和 Jersey Club 放在同一首歌里','这是 90 秒版本，想听听大家对鼓组和人声空间的意见。','原创作品,Demo','published')`),
      db.prepare(`INSERT OR IGNORE INTO library_entries (id,owner_id,category,title,summary,body,status) VALUES ('seed-choir','seed-editor','课程','Gospel Choir：声部、律动与现场','从 Soprano、Alto、Tenor 的关系开始理解合唱编排。','包含六个入门章节的编辑课程。','approved')`),
      db.prepare(`INSERT OR IGNORE INTO library_entries (id,owner_id,category,title,summary,body,status) VALUES ('seed-yandhi','seed-editor','档案','Yandhi：未发行版本与时间线','整理公开流传版本、录音时间线与相关资料来源。','仅收录可公开引用的资料说明。','approved')`),
      db.prepare(`INSERT OR IGNORE INTO exhibitions (id,owner_id,title,summary,curatorial_statement,external_url,status) VALUES ('seed-pablo-king','seed-editor','从 The Life of Pablo 到 Jesus Is King','歌词、采样与福音叙事的对照研究','通过两个时期的作品观察 Kanye West 对信仰、家庭和公共表达的处理。','https://example.com/exhibition/pablo-king','approved')`),
    ]);
  }
}

async function ensureUserProfileColumns(db: D1Database) {
  const info = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  const columns = new Set(info.results.map((column) => column.name));
  const additions = [
    ["phone", "ALTER TABLE users ADD COLUMN phone TEXT"],
    ["phone_verified_at", "ALTER TABLE users ADD COLUMN phone_verified_at TEXT"],
    ["avatar_url", "ALTER TABLE users ADD COLUMN avatar_url TEXT"],
    ["password_hash", "ALTER TABLE users ADD COLUMN password_hash TEXT"],
  ] as const;
  for (const [name, sql] of additions) {
    if (!columns.has(name)) await db.prepare(sql).run();
  }
}

async function ensureSmsCodeColumns(db: D1Database) {
  const info = await db.prepare("PRAGMA table_info(sms_codes)").all<{ name: string; notnull: number }>();
  const columns = new Set(info.results.map((column) => column.name));
  const additions = [
    ["email", "ALTER TABLE sms_codes ADD COLUMN email TEXT"],
    ["channel", "ALTER TABLE sms_codes ADD COLUMN channel TEXT NOT NULL DEFAULT 'phone'"],
  ] as const;
  for (const [name, sql] of additions) {
    if (!columns.has(name)) await db.prepare(sql).run();
  }
  // 旧表 phone 是 NOT NULL，无法存邮箱验证码（邮箱记录 phone 为 NULL）。
  // 检查约束，必要时重建表。
  const phoneCol = info.results.find((column) => column.name === "phone");
  if (phoneCol?.notnull) {
    await db.batch([
      db.prepare("ALTER TABLE sms_codes RENAME TO sms_codes_old"),
      db.prepare(`CREATE TABLE sms_codes (id TEXT PRIMARY KEY, phone TEXT, email TEXT, channel TEXT NOT NULL DEFAULT 'phone', code TEXT NOT NULL, expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
      db.prepare(`INSERT INTO sms_codes (id, phone, email, channel, code, expires_at, used, created_at) SELECT id, phone, NULL, COALESCE(channel, 'phone'), code, expires_at, used, created_at FROM sms_codes_old`),
      db.prepare("DROP TABLE sms_codes_old"),
      db.prepare("CREATE INDEX IF NOT EXISTS sms_codes_phone_idx ON sms_codes(phone, created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS sms_codes_email_idx ON sms_codes(email, created_at)"),
    ]);
  }
}

async function ensureContentBlocksColumns(db: D1Database) {
  const libraryInfo = await db.prepare("PRAGMA table_info(library_entries)").all<{ name: string }>();
  if (!libraryInfo.results.some((column) => column.name === "blocks")) {
    await db.prepare("ALTER TABLE library_entries ADD COLUMN blocks TEXT").run();
  }
  const exhibitionInfo = await db.prepare("PRAGMA table_info(exhibitions)").all<{ name: string }>();
  if (!exhibitionInfo.results.some((column) => column.name === "blocks")) {
    await db.prepare("ALTER TABLE exhibitions ADD COLUMN blocks TEXT").run();
  }
}
