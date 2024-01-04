import { FastifyReply, FastifyRequest } from "fastify";
import { LazyLoad } from "../../types/globalSchemas";
import { generatePresignedGetUrl, S3_URLs } from "../../utils/aws";
import { createEnryptedKey, decrypt, decryptKey } from "../../utils/crypto";
import { formatBasicUser } from "../../utils/dataFormatting";
import prisma from "../../utils/prisma";
import { basicProfileSelect } from "../yakka/yakka.service";
import { formatMessages } from "./chat.helper";
import { CreateChatParams, GetChatParams } from "./chat.schema";
export const createChatHandler = async (
	request: FastifyRequest<{
		Params: CreateChatParams;
	}>,
	reply: FastifyReply
) => {
	const { userId } = request.params;
	const { id: currentUserId } = request.user;

	if (userId === currentUserId) {
		return reply.code(400).send({
			message: "Cannot create a chat with yourself",
		});
	}


	// The client now no longer requires yakkas to be friends to chat
	// will leave this commented out incase it could aid future development

	// check if friends
	// const isFriend = await prisma.friends.findFirst({
	// 	where: {
	// 		OR: [
	// 			{
	// 				receiverId: currentUserId,
	// 				senderId: userId,
	// 			},
	// 			{
	// 				receiverId: userId,
	// 				senderId: currentUserId,
	// 			},
	// 		],
	// 	},
	// });

	// if (!isFriend) {
	// 	return reply.code(400).send({
	// 		message: "Cannot create a chat with a user that is not a friend",
	// 	});
	// }

	// Find a chat that already exists between the two users
	// NOTE: This is going on the assumption that group chats will not be implemented
	// If group chats are implemented, this will need to be changed
	const existingChat = await prisma.chat.findFirst({
		where: {
			AND: [
				{
					users: {
						some: {
							userId: currentUserId,
						},
					},
				},
				{
					users: {
						some: {
							userId,
						},
					},
				},
			],
		},
	});

	console.log("Does chat exist?", existingChat, [currentUserId, userId]);

	if (existingChat) {
		return reply.send({
			chatId: existingChat.id,
		});
	}

	// Create a new chat

	const dataKey = createEnryptedKey();

	const newChat = await prisma.chat.create({
		data: {
			dataKey,

			users: {
				createMany: {
					data: [
						{
							userId: currentUserId,
						},
						{
							userId,
						},
					],
				},
			},
		},
	});

	return reply.code(201).send({
		chatId: newChat.id,
	});
};

export const getChatHandler = async (
	request: FastifyRequest<{
		Params: GetChatParams;
		Querystring: LazyLoad;
	}>,
	reply: FastifyReply
) => {
	const { chatId } = request.params;
	const { id: currentUserId } = request.user;
	const { limit, page } = request.query;

	// Check if the user is a member of the chat
	const chat = await prisma.chat.findFirst({
		where: {
			id: chatId,
			users: {
				some: {
					userId: currentUserId,
				},
			},
		},
	});

	if (!chat) {
		return reply.code(403).send({
			message: "You are not a member of this chat",
		});
	}

	// Get the messages
	const messages = await prisma.message.findMany({
		where: {
			chatId,
		},
		skip: page * limit,
		take: limit,
		orderBy: {
			createdAt: "desc",
		},
	});

	// If we have less messages than the limit, we know there are no more messages
	const hasMore = messages.length === limit;

	const formattedMessages = await formatMessages({ ...chat, messages });

	return reply.send({
		messages: formattedMessages,
		nextPage: hasMore ? page + 1 : null,
	});
};

export const getChatsHandler = async (
	request: FastifyRequest<{
		Querystring: LazyLoad;
	}>,
	reply: FastifyReply
) => {
	const { id: currentUserId } = request.user;
	const { limit, page } = request.query;

	const chats = await prisma.chat.findMany({
		where: {
			users: {
				some: {
					userId: currentUserId,
				},
			},
			// Ensure that the chat has at least one message
			messages: {
				some: {
					id: {
						gt: 0,
					},
				},
			},
		},
		select: {
			id: true,
			dataKey: true,

			messages: {
				orderBy: {
					createdAt: "desc",
				},
				take: 5,
			},

			users: {
				select: {
					user: {
						...basicProfileSelect,
					},
				},
			},
		},
		skip: page * limit,
		take: limit,
		orderBy: {
			createdAt: "desc",
		},
	});

	const userChats = await prisma.userChat.findMany({
		where: {
			chatId: {
				in: chats.map(chat => chat.id),
			},

			userId: currentUserId,
		},
		select: {
			chatId: true,
			hasUnreadMessages: true,
		},
	});

	const hasMore = chats.length === limit;

	const formattedChats = [];

	for (const chat of chats) {
		console.log(chat);
		const otherUser = chat.users.find(
			user => user.user.id !== currentUserId
		)?.user;

		if (!otherUser) continue;

		const formattedMessages = await formatMessages(chat);

		formattedChats.push({
			id: chat.id,
			recipient: formatBasicUser(otherUser),
			lastMessage: {
				...formattedMessages[0],
				senderName:
					formattedMessages[0].senderId === currentUserId
						? "You"
						: otherUser.firstName,
			},
			hasUnreadMessages: userChats.find(userChat => userChat.chatId === chat.id)
				?.hasUnreadMessages,
		});
	}

	return reply.send({
		chats: formattedChats,
		hasUnreadMessages: formattedChats.some(
			userChat => userChat.hasUnreadMessages
		),
		nextPage: hasMore ? page + 1 : null,
	});
};

export const markChatAsReadHandler = async (
	request: FastifyRequest<{
		Params: GetChatParams;
	}>,
	reply: FastifyReply
) => {
	const { chatId } = request.params;
	const { id: currentUserId } = request.user;

	await prisma.userChat.update({
		where: {
			userId_chatId: {
				userId: currentUserId,
				chatId,
			},
		},
		data: {
			hasUnreadMessages: false,
		},
	});

	return reply.send({
		message: "Chat marked as read",
	});
};
