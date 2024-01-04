import { NotificationType } from "@prisma/client";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import prisma from "../../utils/prisma";

export const notificationText: {
	// All keys except MISC
	[K in NotificationType as K extends "MISC" ? never : K]: {
		clause: string;
		type: K;
	};
} = {
	GROUP_REVIEWED: {
		clause: "rated your group",
		type: "GROUP_REVIEWED",
	},
	GROUP_UPDATED: {
		clause: "updated your planned group",
		type: "GROUP_UPDATED",
	},
	GROUP_INVITE: {
		clause: "invited you to a group",
		type: "GROUP_INVITE",
	},
	GROUP_ACCEPTED: {
		clause: "accepted your group invite",
		type: "GROUP_ACCEPTED",
	},
	GROUP_DECLINED: {
		clause: "declined your group invite",
		type: "GROUP_DECLINED",
	},
	GROUP_CANCELLED: {
		clause: "cancelled the group",
		type: "GROUP_CANCELLED",
	},
	NEARBY_GROUP_CREATED: {
		clause: "new group is created near you",
		type: "NEARBY_GROUP_CREATED",
	},
	YAKKA_INVITE: {
		clause: "invited you to a YAKKA",
		type: "YAKKA_INVITE",
	},
	YAKKA_ACCEPTED: {
		clause: "accepted your YAKKA invite",
		type: "YAKKA_ACCEPTED",
	},
	YAKKA_DECLINED: {
		clause: "declined your YAKKA invite",
		type: "YAKKA_DECLINED",
	},
	YAKKA_CANCELLED: {
		clause: "cancelled the YAKKA",
		type: "YAKKA_CANCELLED",
	},
	ACCEPTED_FRIEND_REQUEST: {
		clause: "accepted your friend request",
		type: "ACCEPTED_FRIEND_REQUEST",
	},
	FRIEND_REQUEST: {
		clause: "sent you a friend request",
		type: "FRIEND_REQUEST",
	},
	YAKKA_REVIEWED: {
		clause: "rated your YAKKA",
		type: "YAKKA_REVIEWED",
	},
	YAKKA_UPDATED: {
		clause: "updated your planned YAKKA",
		type: "YAKKA_UPDATED",
	},
	VERIFICATION_FAILED: {
		clause: "Your image verification failed. Please try again.",
		type: "VERIFICATION_FAILED",
	},
	VERIFICATION_SUCCEEDED: {
		clause: "Your image verification succeeded.",
		type: "VERIFICATION_SUCCEEDED",
	},
	VERIFICATION_REMINDER: {
		clause: "Please verify your YAKKA account",
		type: "VERIFICATION_REMINDER",
	},
};

export const sendPushNotifications = async (
	notifications: ({
		title?: string;
		body: string;
		data?: Record<string, any>;
		pushToken: string | null;
	} & (
		| {
				incrementUnreadCount: true;
				userId: number;
		  }
		| {
				incrementUnreadCount?: false;
				userId?: never;
		  }
	))[]
) => {
	// Create a new Expo SDK client
	// ? optionally providing an access token if you have enabled push security

	let expo = new Expo();

	// Create the messages that you want to send to clients
	let messages = [];
	for (let n of notifications) {
		// Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

		// Check that all your push tokens appear to be valid Expo push tokens
		if (!Expo.isExpoPushToken(n.pushToken)) {
			console.error(`Push token ${n.pushToken} is not a valid Expo push token`);
			continue;
		}
		let badgeCount;
		if (n.incrementUnreadCount && n.userId) {
			badgeCount = await countUnreadNotifications(n.userId);
		}

		// Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
		messages.push({
			to: n.pushToken,
			sound: "default",
			title: n.title,
			body: n.body,
			data: n.data,
			badge: badgeCount,
		} satisfies ExpoPushMessage);
	}

	// The Expo push notification service accepts batches of notifications so
	// that you don't need to send 1000 requests to send 1000 notifications. We
	// recommend you batch your notifications to reduce the number of requests
	// and to compress them (notifications with similar content will get
	// compressed).
	let chunks = expo.chunkPushNotifications(messages);
	let tickets = [];

	// Send the chunks to the Expo push notification service. There are
	// different strategies you could use. A simple one is to send one chunk at a
	// time, which nicely spreads the load out over time:
	for (let chunk of chunks) {
		try {
			let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
			console.log(ticketChunk);
			tickets.push(...ticketChunk);
			// NOTE: If a ticket contains an error code in ticket.details.error, you
			// must handle it appropriately. The error codes are listed in the Expo
			// documentation:
			// https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
		} catch (error) {
			console.error(error);
		}
	}
};

// Later, after the Expo push notification service has delivered the
// notifications to Apple or Google (usually quickly, but allow the the service
// up to 30 minutes when under load), a "receipt" for each notification is
// created. The receipts will be available for at least a day; stale receipts
// are deleted.
//
// The ID of each receipt is sent back in the response "ticket" for each
// notification. In summary, sending a notification produces a ticket, which
// contains a receipt ID you later use to get the receipt.
//
// The receipts may contain error codes to which you must respond. In
// particular, Apple or Google may block apps that continue to send
// notifications to devices that have blocked notifications or have uninstalled
// your app. Expo does not control this policy and sends back the feedback from
// Apple and Google so you can handle it appropriately.
// let receiptIds = [];
// for (let ticket of tickets) {
// NOTE: Not all tickets have IDs; for example, tickets for notifications
// that could not be enqueued will have error information and no receipt ID.
// 	if (ticket.id) {
// 		receiptIds.push(ticket.id);
// 	}
// }

// let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
// (async () => {
// Like sending notifications, there are different strategies you could use
// to retrieve batches of receipts from the Expo service.
// 	for (let chunk of receiptIdChunks) {
// 		try {
// 			let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
// 			console.log(receipts);

// The receipts specify whether Apple or Google successfully received the
// notification and information about an error, if one occurred.
// 			for (let receiptId in receipts) {
// 				let { status, message, details } = receipts[receiptId];
// 				if (status === "ok") {
// 					continue;
// 				} else if (status === "error") {
// 					console.error(
// 						`There was an error sending a notification: ${message}`
// 					);
// 					if (details && details.error) {
// The error codes are listed in the Expo documentation:
// https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
// You must handle the errors appropriately.
// 						console.error(`The error code is ${details.error}`);
// 					}
// 				}
// 			}
// 		} catch (error) {
// 			console.error(error);
// 		}
// 	}
// })();

export const countUnreadNotifications = async (userId: number) => {
	return await prisma.notification.count({
		where: {
			userId,
			isRead: false,
			isActioned: false,
		},
	});
};
