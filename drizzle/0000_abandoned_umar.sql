CREATE TABLE `attempts` (
	`email` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` text PRIMARY KEY NOT NULL,
	`orderId` text NOT NULL,
	`productId` text NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`image` text NOT NULL,
	`size` text,
	`quantity` integer NOT NULL,
	`unitPrice` integer NOT NULL,
	`totalPrice` integer NOT NULL,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`orderNumber` text NOT NULL,
	`userId` text NOT NULL,
	`region` text NOT NULL,
	`totalAmount` integer NOT NULL,
	`status` text NOT NULL,
	`createdAt` text NOT NULL,
	`confirmedAt` text,
	`confirmationHash` text NOT NULL,
	`idempotencyKey` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_orderNumber_unique` ON `orders` (`orderNumber`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_confirmationHash_unique` ON `orders` (`confirmationHash`);--> statement-breakpoint
CREATE UNIQUE INDEX `order_idempotency` ON `orders` (`userId`,`idempotencyKey`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`orderId` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`html` text NOT NULL,
	`confirmationUrl` text NOT NULL,
	`status` text NOT NULL,
	`lastError` text,
	`sentAt` text,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_orderId_unique` ON `outbox` (`orderId`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`image` text NOT NULL,
	`region` text NOT NULL,
	`price` integer NOT NULL,
	`availableQuantity` integer NOT NULL,
	`supplierId` text NOT NULL,
	`category` text NOT NULL,
	FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "product_stock" CHECK("products"."availableQuantity" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expiresAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`region` text NOT NULL,
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_region_unique` ON `suppliers` (`region`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`email` text NOT NULL,
	`passwordHash` text NOT NULL,
	`role` text DEFAULT 'distributor' NOT NULL,
	`region` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `variants` (
	`id` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`size` text NOT NULL,
	`availableQuantity` integer NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "variant_stock" CHECK("variants"."availableQuantity" >= 0)
);
