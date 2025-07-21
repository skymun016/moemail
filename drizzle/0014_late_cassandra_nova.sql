ALTER TABLE `email` ADD `is_auto_generated` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `email` ADD `generation_batch_id` text;--> statement-breakpoint
ALTER TABLE `email` ADD `email_sequence` integer;--> statement-breakpoint
CREATE INDEX `email_is_auto_generated_idx` ON `email` (`is_auto_generated`);--> statement-breakpoint
CREATE INDEX `email_generation_batch_id_idx` ON `email` (`generation_batch_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `max_emails` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `created_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `user` ADD `is_admin_created` integer DEFAULT false;