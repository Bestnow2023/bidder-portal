CREATE TABLE `portal_chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`author_name` text NOT NULL,
	`author_role` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `portal_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `portal_chat_messages_created_idx` ON `portal_chat_messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `portal_payment_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`method` text NOT NULL,
	`address` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `portal_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `portal_payment_methods_user_idx` ON `portal_payment_methods` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `portal_payment_methods_user_method_idx` ON `portal_payment_methods` (`user_id`,`method`);--> statement-breakpoint
CREATE TABLE `portal_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`payment_link` text DEFAULT '' NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `portal_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `portal_payments_user_idx` ON `portal_payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `portal_payments_date_idx` ON `portal_payments` (`scheduled_date`);--> statement-breakpoint
CREATE TABLE `portal_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'bidder' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`rate_per_application` real DEFAULT 0 NOT NULL,
	`bonus_per_interview` real DEFAULT 0 NOT NULL,
	`next_payment_date` text DEFAULT '' NOT NULL,
	`payment_schedule` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portal_users_email_idx` ON `portal_users` (`email`);--> statement-breakpoint
CREATE INDEX `portal_users_role_idx` ON `portal_users` (`role`);--> statement-breakpoint
CREATE INDEX `portal_users_status_idx` ON `portal_users` (`status`);--> statement-breakpoint
CREATE TABLE `portal_work_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`work_date` text NOT NULL,
	`sheet_link` text NOT NULL,
	`applied_jobs` integer DEFAULT 0 NOT NULL,
	`interviews_scheduled` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `portal_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `portal_work_logs_user_idx` ON `portal_work_logs` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `portal_work_logs_user_date_idx` ON `portal_work_logs` (`user_id`,`work_date`);