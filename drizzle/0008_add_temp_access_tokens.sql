-- 添加临时访问令牌表
CREATE TABLE `temp_access_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);

-- 创建索引
CREATE UNIQUE INDEX `token_unique` ON `temp_access_tokens` (`token`);
CREATE INDEX `temp_tokens_user_id_idx` ON `temp_access_tokens` (`user_id`);
CREATE INDEX `temp_tokens_expires_at_idx` ON `temp_access_tokens` (`expires_at`);
