import logger from "../../utils/logger";
import prisma from "../../utils/prisma";
import { sendPushNotifications } from "../notifications/notifications.helper";
import Filter from "bad-words";
import { Message } from "@prisma/client";
import { decryptKey, decrypt } from "../../utils/crypto";

// Scheduled
export const checkForFlaggedMessages = async () => {
	try {
		console.log("Checking for flagged messages");
		const messagesToCheck = await prisma.message.findMany({
			where: {
				checkedForProfanity: false,
				type: "TEXT",
			},
			include: {
				chat: {
					select: {
						dataKey: true,
					},
				},
				sender: {
					select: {
						pushNotificationToken: true,
					},
				},
			},
		});

		const flaggedWords = await prisma.flaggedWords.findMany();
		const autoBanWords = await prisma.autoBanWords.findMany();

		const flaggedWordsArray = flaggedWords.map(word => word.word);
		const autoBanWordsArray = autoBanWords.map(word => word.word);

		type MArray = (Message & {
			chat: {
				dataKey: string;
			};
			sender: {
				pushNotificationToken: string | null;
			};
		})[];

		const flaggedMessages: MArray = [];
		const autoBanMessages: MArray = [];

		const flaggedFilter = new Filter({
			emptyList: true,
		});
		flaggedFilter.addWords(...flaggedWordsArray);

		const autoBanFilter = new Filter({
			emptyList: true,
		});
		autoBanFilter.addWords(...autoBanWordsArray);

		messagesToCheck.forEach(message => {
			const key = decryptKey(message.chat.dataKey);

			const decryptedMessage = decrypt(message.content, key);

			// Check everywords in the message for flagged words

			const messageWords = decryptedMessage.split(" ");

			if (flaggedFilter.isProfane(decryptedMessage)) {
				flaggedMessages.push(message);
			}

			if (autoBanFilter.isProfane(decryptedMessage)) {
				autoBanMessages.push(message);
			}
		});

		// Const mark all messages as checked
		// and update the flagged messages

		const checkPromise = prisma.message.updateMany({
			where: {
				id: {
					in: messagesToCheck.map(message => message.id),
				},
			},
			data: {
				checkedForProfanity: true,
			},
		});

		console.log(flaggedMessages);

		const flagPromise = prisma.flaggedMessage.createMany({
			skipDuplicates: true,
			data: flaggedMessages.map(message => ({
				messageId: message.id,
			})),
		});

		// Auto ban users

		const usersToBan = Array.from(
			new Set(autoBanMessages.map(message => message.senderId))
		);

		// Invalidate all refresh tokens for users that have been banned
		const removeSessionPromise = prisma.session.deleteMany({
			where: {
				userId: {
					in: usersToBan,
				},
			},
		});
		// Ban users
		const banPromise = prisma.bannedUsers.createMany({
			skipDuplicates: true,
			data: usersToBan.map(userId => ({
				userId,
				reason: "Auto banned for saying a banned word",
			})),
		});

		const cancelAllBannedUsersYakkasPromise = prisma.yakka.updateMany({
			where: {
				OR: [
					{
						organiserId: {
							in: usersToBan,
						},
					},
					{
						inviteeId: {
							in: usersToBan,
						},
					},
				],
			},
			data: {
				status: "DECLINED",
			},
		});

		await prisma.$transaction([
			checkPromise,
			flagPromise,
			banPromise,
			removeSessionPromise,
			cancelAllBannedUsersYakkasPromise,
		]);

		// Notify all users that have been banned

		await sendPushNotifications(
			usersToBan.map(userId => {
				const pushToken = autoBanMessages.find(
					message => message.senderId === userId
				)?.sender.pushNotificationToken;

				return {
					pushToken: pushToken || null,
					title: "You have been banned",
					body: "You have been banned from YAKKA for saying a banned word",
					data: {
						type: "BLACKLISTED",
					},
				};
			})
		);
		console.log("Finished checking for flagged messages");
	} catch (err) {
		logger.error(err);
	}
};
