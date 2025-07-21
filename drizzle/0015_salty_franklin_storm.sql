ALTER TABLE `user` ADD `expires_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `status` text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `user` ADD `last_login_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `created_at` integer;--> statement-breakpoint
CREATE INDEX `user_expires_at_idx` ON `user` (`expires_at`);--> statement-breakpoint
CREATE INDEX `user_status_idx` ON `user` (`status`);--> statement-breakpoint
CREATE INDEX `user_last_login_idx` ON `user` (`last_login_at`);--> statement-breakpoint
CREATE INDEX `user_created_at_idx` ON `user` (`created_at`);