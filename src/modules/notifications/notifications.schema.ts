import { literal, z } from "zod";
import { lazyLoadResponseSchema } from "../../types/globalSchemas";
import { basicProfileSchema } from "../user/user.schema";
import { NotificationType } from "@prisma/client";

export const notificationSchema = z.object({
	id: z.number(),
	prepositionName: z.string().nullish(),
	clause: z.string(),
	timestamp: z.number(),
	yakkaId: z.number().nullish(),

	// @ts-ignore
	type: z.enum([...Object.values(NotificationType)]),
	review: z
		.object({
			id: z.number(),
			rating: z.number(),
			comment: z.string(),
		})
		.nullish(),
	friendRequestId: z.number().nullish(),

	sender: basicProfileSchema.nullish(),
	isRead: z.boolean(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const getNotificationsResponseSchema = lazyLoadResponseSchema.extend({
	notifications: z.array(notificationSchema),
	unreadCount: z.number(),
});
export const notificationParams = z.object({
	notificationId: z.string().transform(id => Number(id)),
});

export type NotificationParams = z.infer<typeof notificationParams>;

export const readNotificationInputSchema = z.object({
	notificationIds: z.array(z.number()),
});
export type ReadNotificationInput = z.infer<typeof readNotificationInputSchema>;

export const readNotificationsResponseSchema = z.object({
	unreadCount: z.number(),
});
