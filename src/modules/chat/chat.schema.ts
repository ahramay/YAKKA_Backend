import { z } from "zod";
import { MessageType } from "@prisma/client";
import { basicProfileSchema } from "../user/user.schema";
export const createChatParamsSchema = z.object({
	userId: z.string().transform(id => Number(id)),
});
export type CreateChatParams = z.infer<typeof createChatParamsSchema>;

export const createChatResponseSchema = z.object({
	chatId: z.string(),
});

export const getChatParamsSchema = z.object({
	chatId: z.string(),
});
export type GetChatParams = z.infer<typeof getChatParamsSchema>;

const basicMessage = z.object({
	id: z.number(),
	content: z.string(),
	sentAt: z.date(),
	type: z.enum([MessageType.TEXT, MessageType.IMAGE, MessageType.AUDIO]),
	mediaUrl: z.string().url().nullable(),
});

export const getChatResponseSchema = z.object({
	messages: z.array(
		basicMessage.extend({
			// TODO: Check what happens when a user is deleted
			senderId: z.number(),
		})
	),
	nextPage: z.number().nullable(),
});

export const getChatListResponseSchema = z.object({
	chats: z.array(
		z.object({
			id: z.string(),
			recipient: basicProfileSchema,
			hasUnreadMessages: z.boolean(),
			lastMessage: basicMessage.extend({
				senderName: z.string(),
			}),
		})
	),
	hasUnreadMessages: z.boolean(),
	nextPage: z.number().nullable(),
});
