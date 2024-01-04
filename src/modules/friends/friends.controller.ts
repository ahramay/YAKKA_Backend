import { Prisma } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";
import { UserParams } from "../../types/globalSchemas";
import { formatBasicUser } from "../../utils/dataFormatting";
import prisma from "../../utils/prisma";
import {
	notificationText,
	sendPushNotifications,
} from "../notifications/notifications.helper";
import { addFriend } from "./friends.helper";
import {
	FriendParams,
	RemoveFriendParams,
	RespondToFriendRequest,
} from "./friends.schema";

export const sendFriendRequestHandler = async (
	request: FastifyRequest<{
		Params: UserParams;
	}>,
	reply: FastifyReply
) => {
	const { userId } = request.params;

	try {
		if (request.user.id === userId) {
			return reply.code(403).send({
				message: "You can't send a friend request to yourself",
			});
		}

		await addFriend({
			senderId: request.user.id,
			receiverId: userId,
		});

		reply.status(201).send({ message: "Friend request sent" });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				return reply
					.status(409)
					.send({ message: "Friend request already sent" });
			}
			if (error.code === "P2003") {
				return reply.status(404).send({ message: "User not found" });
			}
		}
		throw error;
	}
};

export const respondToFriendRequestHandler = async (
	request: FastifyRequest<{
		Params: FriendParams;
		Body: RespondToFriendRequest;
	}>,
	reply: FastifyReply
) => {
	const { requestId } = request.params;
	const { accept } = request.body;

	try {
		const friendRequest = await prisma.friends.findUnique({
			where: {
				id: requestId,
			},
			include: {
				sender: {
					select: {
						id: true,
						pushNotificationToken: true,
					},
				},
				receiver: {
					select: {
						id: true,
						firstName: true,
					},
				},
			},
		});
		if (!friendRequest) {
			return reply.status(404).send({ message: "Friend request not found" });
		}
		if (friendRequest?.receiver.id !== request.user.id) {
			return reply
				.status(403)
				.send({ message: "You can't respond to a request that you sent." });
		}
		if (friendRequest?.status !== "PENDING") {
			return reply
				.status(409)
				.send({ message: "You have already responded to this request" });
		}

		if (!accept) {
			await prisma.friends.delete({
				where: {
					id: Number(requestId),
				},
			});
			return reply.send({ message: "Friend request declined" });
		}

		// Remove the friend request notification
		// Clear the invite notification
		const notification = await prisma.notification.findFirst({
			where: {
				friendRequestId: friendRequest.id,
				type: "FRIEND_REQUEST",
			},
		});
		if (notification) {
			await prisma.notification.update({
				where: {
					id: notification.id,
				},
				data: {
					isActioned: true,
				},
			});
		}

		await prisma.friends.update({
			where: {
				id: Number(requestId),
			},
			data: {
				status: "ACCEPTED",
			},
		});
		const { clause, type } = notificationText.ACCEPTED_FRIEND_REQUEST;

		await prisma.notification.create({
			data: {
				clause,
				prepositionName: friendRequest.receiver.firstName || "Someone",
				type,
				userId: friendRequest.sender.id,
				friendRequestId: friendRequest.id,
				senderId: request.user.id,
			},
		});

		await sendPushNotifications([
			{
				body: `${friendRequest.receiver.firstName || "Someone"} ${clause}`,
				pushToken: friendRequest.sender.pushNotificationToken,
				incrementUnreadCount: true,
				userId: friendRequest.sender.id,
			},
		]);

		return reply.send({ message: "Friend request updated" });
	} catch (error) {
		throw error;
	}
};

export const getFriendsHandler = async (
	request: FastifyRequest,
	reply: FastifyReply
) => {
	// User can be the receiver or the sender, we just want to return the other user and not send back themselves
	const friends = await prisma.friends.findMany({
		where: {
			OR: [
				{
					receiverId: request.user.id,
					status: "ACCEPTED",
				},
				{
					senderId: request.user.id,
					status: "ACCEPTED",
				},
			],
		},
		include: {
			sender: {
				include: {
					images: true,
				},
			},
			receiver: {
				include: {
					images: true,
				},
			},
		},
	});

	// Create list of all users except the current user

	const users = friends.map(f => {
		if (f.senderId === request.user.id) {
			return formatBasicUser(f.receiver);
		}
		return formatBasicUser(f.sender);
	});
	return { friends: users };
};

export const removeFriendHandler = async (
	request: FastifyRequest<{
		Params: RemoveFriendParams;
	}>,
	reply: FastifyReply
) => {
	const { friendshipId } = request.params;

	try {
		const friend = await prisma.friends.findUnique({
			where: {
				id: friendshipId,
			},
		});
		if (!friend) {
			return reply.status(404).send({ message: "Friend not found" });
		}
		if (
			friend.senderId !== request.user.id &&
			friend.receiverId !== request.user.id
		) {
			return reply.status(403).send({
				message: "You can't remove a friend that you are not friends with",
			});
		}

		await prisma.friends.delete({
			where: {
				id: friendshipId,
			},
		});

		return reply.send({ message: "Friend removed" });
	} catch (error) {
		throw error;
	}
};
