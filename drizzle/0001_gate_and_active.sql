ALTER TABLE `family_settings` ADD `gate_passphrase_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `active` integer DEFAULT true NOT NULL;