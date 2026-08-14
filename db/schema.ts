import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  phone: text("phone"),
  phoneVerifiedAt: text("phone_verified_at"),
  displayName: text("display_name").notNull(),
  username: text("username").notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  ...timestamps,
}, (table) => [
  uniqueIndex("users_email_unique").on(table.email),
  uniqueIndex("users_phone_unique").on(table.phone),
  uniqueIndex("users_username_unique").on(table.username),
]);

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags").notNull().default(""),
  mediaUrl: text("media_url"),
  status: text("status", { enum: ["published", "hidden"] }).notNull().default("published"),
  ...timestamps,
}, (table) => [index("posts_status_created_idx").on(table.status, table.createdAt)]);

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  status: text("status", { enum: ["published", "pending", "hidden"] }).notNull().default("published"),
  ...timestamps,
}, (table) => [index("comments_post_idx").on(table.postId, table.createdAt)]);

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("media_storage_key_unique").on(table.storageKey)]);

export const libraryEntries = sqliteTable("library_entries", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  sourceUrl: text("source_url"),
  mediaUrl: text("media_url"),
  blocks: text("blocks"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  reviewerNote: text("reviewer_note").notNull().default(""),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: text("reviewed_at"),
  ...timestamps,
}, (table) => [index("library_status_category_idx").on(table.status, table.category)]);

export const exhibitions = sqliteTable("exhibitions", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  curatorialStatement: text("curatorial_statement").notNull(),
  externalUrl: text("external_url"),
  coverUrl: text("cover_url"),
  blocks: text("blocks"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  reviewerNote: text("reviewer_note").notNull().default(""),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: text("reviewed_at"),
  ...timestamps,
}, (table) => [index("exhibitions_status_created_idx").on(table.status, table.createdAt)]);

export const adminActions = sqliteTable("admin_actions", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("admin_actions_entity_idx").on(table.entityType, table.entityId)]);

export const smsCodes = sqliteTable("sms_codes", {
  id: text("id").primaryKey(),
  phone: text("phone"),
  email: text("email"),
  channel: text("channel").notNull().default("phone"),
  code: text("code").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: integer("used").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("sms_codes_phone_idx").on(table.phone, table.createdAt),
  index("sms_codes_email_idx").on(table.email, table.createdAt),
]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
  lastSeenAt: text("last_seen_at"),
}, (table) => [index("sessions_user_idx").on(table.userId)]);

export const siteAssets = sqliteTable("site_assets", {
  key: text("key").primaryKey(),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
