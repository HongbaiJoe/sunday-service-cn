CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `site_assets` (
	`key` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sms_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text,
	`email` text,
	`channel` text DEFAULT 'phone' NOT NULL,
	`code` text NOT NULL,
	`expires_at` text NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sms_codes_phone_idx` ON `sms_codes` (`phone`,`created_at`);--> statement-breakpoint
CREATE INDEX `sms_codes_email_idx` ON `sms_codes` (`email`,`created_at`);--> statement-breakpoint
ALTER TABLE `comments` ADD `body_en` text;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `title_en` text;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `summary_en` text;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `curatorial_statement_en` text;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `blocks` text;--> statement-breakpoint
ALTER TABLE `library_entries` ADD `category_en` text;--> statement-breakpoint
ALTER TABLE `library_entries` ADD `title_en` text;--> statement-breakpoint
ALTER TABLE `library_entries` ADD `summary_en` text;--> statement-breakpoint
ALTER TABLE `library_entries` ADD `body_en` text;--> statement-breakpoint
ALTER TABLE `library_entries` ADD `blocks` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `title_en` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `body_en` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `tags_en` text;--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;