CREATE TABLE `allowances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`cadence` text NOT NULL,
	`day` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_paid_due` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` integer,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `family_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`interest_pct_monthly` real DEFAULT 5 NOT NULL,
	`lock_days` integer DEFAULT 30 NOT NULL,
	`ntfy_topic` text,
	`last_interest_run` text,
	`last_jobs_run` text
);
--> statement-breakpoint
CREATE TABLE `fx_rate` (
	`id` integer PRIMARY KEY NOT NULL,
	`rate` real NOT NULL,
	`as_of` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`target` integer NOT NULL,
	`created_at` integer NOT NULL,
	`achieved_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`ticker` text NOT NULL,
	`shares` real NOT NULL,
	`avg_cost_cents` real NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `positions_user_ticker` ON `positions` (`user_id`,`ticker`);--> statement-breakpoint
CREATE TABLE `prices` (
	`ticker` text PRIMARY KEY NOT NULL,
	`close_usd` real NOT NULL,
	`as_of` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `savings_lots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`original_amount` integer NOT NULL,
	`remaining` integer NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	`matures_at` integer NOT NULL,
	`tx_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tx_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`checking_delta` integer NOT NULL,
	`description` text NOT NULL,
	`meta` text,
	`created_at` integer NOT NULL,
	`decided_at` integer,
	`decided_by_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decided_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`pin_hash` text NOT NULL,
	`interest_pct_monthly` real,
	`lock_days` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_unique` ON `users` (`name`);