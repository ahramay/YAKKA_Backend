import prisma from "../../utils/prisma";
import { subDays, subHours } from "date-fns";
import { sendPushNotifications } from "../notifications/notifications.helper";
export const clearLocations = async () => {
	// This runs every hour, clear all locations that are older than 12 hours

	await prisma.userLocation.deleteMany({
		where: {
			createdAt: {
				lte: subHours(Date.now(), 12),
			},
		},
	});
};

export const sendVerificationReminder = async () => {
	console.log("Sending verification reminders");
	const users = await prisma.user.findMany({
		where: {
			isVerified: false,
			// Where they don't have a verified image
			UserVerificationImage: {
				is: null,
			},
			// Where they haven't been reminded
			verificationReminderSent: false,
			createdAt: {
				//At least 7 days ago
				lte: subDays(Date.now(), 7),
			},
		},
	});

	const notificationPromise = prisma.notification.createMany({
		data: users.map(user => ({
			userId: user.id,
			type: "VERIFICATION_REMINDER",
			clause: "Please verify your YAKKA account",
		})),
	});

	const pushPromise = sendPushNotifications(
		users.map(user => ({
			body: "Reminder: Please verify your YAKKA account",
			pushToken: user.pushNotificationToken,
			incrementUnreadCount: true,
			userId: user.id,
			data: {
				type: "VERIFICATION_REMINDER",
			},
		}))
	);

	const updatePromise = prisma.user.updateMany({
		where: {
			id: {
				in: users.map(user => user.id),
			},
		},
		data: {
			verificationReminderSent: true,
		},
	});

	await Promise.all([notificationPromise, pushPromise, updatePromise]);
};
