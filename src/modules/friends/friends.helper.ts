import prisma from "../../utils/prisma";
import {
	notificationText,
	sendPushNotifications,
} from "../notifications/notifications.helper";

export const addFriend = async ({
	senderId,
	receiverId,
}: {
	senderId: number;
	receiverId: number;
}) => {
	if (senderId === receiverId) {
		throw new Error("You can't add yourself as a friend");
	}

	const existingFriendRequest = await prisma.friends.findFirst({
		where: {
			OR: [
				{
					senderId,
					receiverId,
				},
				{
					senderId: receiverId,
					receiverId: senderId,
				},
			],
		},
	});

	if (existingFriendRequest) {
		throw new Error("Friend request already sent");
	}

	const req = await prisma.friends.create({
		data: {
			senderId,
			receiverId,
		},
		select: {
			id: true,
			sender: {
				select: {
					firstName: true,
				},
			},
			receiver: {
				select: {
					pushNotificationToken: true,
				},
			},
		},
	});

	const { clause, type } = notificationText.FRIEND_REQUEST;
	await prisma.notification.create({
		data: {
			prepositionName: req.sender.firstName || "Someone",
			clause,
			userId: receiverId,
			type: "FRIEND_REQUEST",
			friendRequestId: req.id,
			senderId,
		},
	});
	await sendPushNotifications([
		{
			body: `${req.sender.firstName || "Someone"} ${clause}`,
			data: {
				type,
				friendRequestId: req.id,
			},
			pushToken: req.receiver.pushNotificationToken,
			incrementUnreadCount: true,
			userId: receiverId,
		},
	]);
};
