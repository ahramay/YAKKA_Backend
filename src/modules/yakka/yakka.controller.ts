import { format } from "date-fns";
import { FastifyReply, FastifyRequest } from "fastify";
import { LazyLoad } from "../../types/globalSchemas";
import { formatDate } from "../../utils/dates";
import { checkIsBlocked, nextPage } from "../../utils/globalHelpers";
import prisma from "../../utils/prisma";
import {
	notificationText,
	sendPushNotifications,
} from "../notifications/notifications.helper";
import { alertTrustedContacts, formatYakkaList } from "./yakka.helper";
import {
	CreateYakka,
	UpdateYakka,
	YakkaParams,
	YakkaResponse,
} from "./yakka.schema";
import {
	fetchPlannedYakkas,
	fetchRecentYakkas,
	fetchYakka,
} from "./yakka.service";

export const createYakkaHandler = async (
	request: FastifyRequest<{ Body: CreateYakka }>,
	reply: FastifyReply
) => {
	const { coordinates, date, endTime, ...rest } = request.body;
	// Not going to happen, but just in case
	if (request.user.id === rest.inviteeId) {
		return reply
			.status(403)
			.send({ message: "You can't invite yourself to a YAKKA" });
	}

	await checkIsBlocked({
		currentUserId: request.user.id,
		otherUserId: rest.inviteeId,
		strict: true,
	});

	const user = await prisma.user.findUnique({
		where: {
			id: request.user.id,
		},
		select: {
			isVerified: true,
		},
	});
	if (!user) {
		throw new Error("User not found");
	}
	if (!user.isVerified) {
		return reply
			.status(403)
			.send({ message: "You need to verify your account first" });
	}

	const formattedStartTime = new Date(date).setSeconds(0, 0);
	const formattedEndTime = new Date(endTime).setSeconds(0, 0);

	const yakka = await prisma.yakka.create({
		data: {
			...rest,
			date: new Date(formattedStartTime),
			endTime: new Date(formattedEndTime),
			coordinates: `${coordinates.latitude},${coordinates.longitude}`,
			organiserId: request.user.id,
		},
		select: {
			id: true,
			organiser: {
				select: {
					firstName: true,
				},
			},
			invitee: {
				select: {
					pushNotificationToken: true,
				},
			},
		},
	});

	const { clause, type } = notificationText.YAKKA_INVITE;
	await prisma.notification.create({
		data: {
			prepositionName: yakka.organiser.firstName || "Someone",
			clause,
			userId: rest.inviteeId,

			type,
			yakkaId: yakka.id,
			senderId: request.user.id,
		},
	});
	await sendPushNotifications([
		{
			body: `${yakka.organiser.firstName || "Someone"} ${clause}`,
			data: {
				type,
				yakkaId: yakka.id,
			},
			pushToken: yakka.invitee.pushNotificationToken,
			incrementUnreadCount: true,
			userId: rest.inviteeId,
		},
	]);

	return reply.status(201).send({
		message: "Yakka created successfully",
	});
};

export const yakkaResponseHandler = async (
	request: FastifyRequest<{ Params: YakkaParams; Body: YakkaResponse }>,
	reply: FastifyReply
) => {
	const { yakkaId } = request.params;
	const { accept } = request.body;

	try {
		const yakkaRequest = await prisma.yakka.findUnique({
			where: {
				id: yakkaId,
			},
			include: {
				invitee: {
					select: {
						firstName: true,
						lastName: true,
						userEmergencyContact: {
							select: {
								phoneNumber: true,
								phoneCountryCode: true,
							},
						},
					},
				},
				organiser: {
					select: {
						firstName: true,
						lastName: true,
						pushNotificationToken: true,
						userEmergencyContact: {
							select: {
								phoneNumber: true,
								phoneCountryCode: true,
							},
						},
					},
				},
			},
		});

		// Sanity checks

		if (!yakkaRequest) {
			return reply.status(404).send({ message: "YAKKA request not found" });
		}
		if (yakkaRequest.organiserId === request.user.id) {
			return reply
				.status(403)
				.send({ message: "You can't respond to a request that you sent." });
		}
		if (yakkaRequest.status !== "PENDING") {
			return reply
				.status(409)
				.send({ message: "You have already responded to this request" });
		}
		if (yakkaRequest.date < new Date()) {
			return reply.status(409).send({
				message: "You can't respond to a YAKKA that has already happened",
			});
		}

		// Update the yakka

		await prisma.yakka.update({
			where: {
				id: yakkaId,
			},
			data: {
				status: accept ? "ACCEPTED" : "DECLINED",
			},
		});

		// Clear the invite notification
		const notification = await prisma.notification.findFirst({
			where: {
				yakkaId,
				type: "YAKKA_INVITE",
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
		//  send a notification to the organiser
		// and send a text to both emergency contacts if the yakka is accepted

		const { type, clause } =
			notificationText[accept ? "YAKKA_ACCEPTED" : "YAKKA_DECLINED"];
		// Send the response notification

		await prisma.notification.create({
			data: {
				clause,
				prepositionName: yakkaRequest.invitee.firstName || "Someone",
				type,
				yakkaId: yakkaId,
				userId: yakkaRequest.organiserId,
				senderId: request.user.id,
			},
		});

		await sendPushNotifications([
			{
				body: `${yakkaRequest.invitee.firstName || "Someone"} ${clause}`,
				data: {
					type,
					yakkaId,
				},
				pushToken: yakkaRequest.organiser.pushNotificationToken,
				incrementUnreadCount: true,
				userId: yakkaRequest.organiserId,
			},
		]);

		if (accept) {
			await alertTrustedContacts(yakkaRequest, "planned");
		}

		return reply.send({ message: "YAKKA request updated" });
	} catch (error) {
		throw error;
	}
};

export const getPlannedYakkasHandler = async (
	request: FastifyRequest<{
		Querystring: LazyLoad;
	}>,
	reply: FastifyReply
) => {
	const { limit, page } = request.query;

	const yakkas = await fetchPlannedYakkas({
		userId: request.user.id,
		limit,
		page,
	});

	return {
		planned: formatYakkaList({
			yakkas,
			userId: request.user.id,
		}),
		nextPage: nextPage(yakkas, limit, page),
	};
};

export const getRecentYakkasHandler = async (
	request: FastifyRequest<{
		Querystring: LazyLoad;
	}>,
	reply: FastifyReply
) => {
	const { limit, page } = request.query;
	const yakkas = await fetchRecentYakkas({
		userId: request.user.id,
		limit,
		page,
	});

	return {
		recent: formatYakkaList({
			yakkas,
			userId: request.user.id,
		}),
		nextPage: nextPage(yakkas, limit, page),
	};
};

export const getYakkaHandler = async (
	request: FastifyRequest<{
		Params: YakkaParams;
	}>,
	reply: FastifyReply
) => {
	const { yakkaId } = request.params;

	const yakka = await fetchYakka(yakkaId);

	if (!yakka) {
		return reply.status(404).send({ message: "YAKKA not found" });
	}

	if (
		yakka.organiser.id !== request.user.id &&
		yakka.invitee.id !== request.user.id
	) {
		return reply.status(403).send({ message: "You can't view this YAKKA" });
	}

	return {
		yakka: formatYakkaList({
			yakkas: [yakka],
			userId: request.user.id,
		})[0],
	};
};

export const updateYakkaHandler = async (
	request: FastifyRequest<{ Params: YakkaParams; Body: UpdateYakka }>,
	reply: FastifyReply
) => {
	const { yakkaId } = request.params;
	const { coordinates, ...rest } = request.body;

	const yakka = await prisma.yakka.findFirst({
		where: {
			id: yakkaId,
			date: {
				gte: new Date(),
			},
			OR: [
				{
					organiserId: request.user.id,
				},
				{
					inviteeId: request.user.id,
				},
			],
		},
		select: {
			id: true,
			organiser: {
				select: {
					id: true,
					firstName: true,
					pushNotificationToken: true,
				},
			},
			invitee: {
				select: {
					id: true,
					firstName: true,
					pushNotificationToken: true,
				},
			},
		},
	});

	if (!yakka) {
		return reply.status(404).send({ message: "YAKKA not found" });
	}

	let coordinatesString;
	if (coordinates) {
		coordinatesString = `${coordinates.latitude},${coordinates.longitude}`;
	}

	await prisma.yakka.update({
		where: {
			id: yakkaId,
		},
		data: {
			...rest,
			coordinates: coordinatesString,
		},
	});

	//  Notify the other user

	const notificationRecipient =
		yakka.organiser.id === request.user.id ? yakka.invitee : yakka.organiser;
	const notificationSender =
		yakka.organiser.id === request.user.id ? yakka.organiser : yakka.invitee;
	const { clause, type } = notificationText.YAKKA_UPDATED;
	await prisma.notification.create({
		data: {
			clause,
			prepositionName: notificationSender.firstName || "Someone",
			type,
			yakkaId: yakkaId,
			userId: notificationRecipient.id,
			senderId: request.user.id,
		},
	});

	await sendPushNotifications([
		{
			body: `${notificationSender.firstName || "Someone"} ${clause}`,
			data: {
				type,
				yakkaId,
			},
			pushToken: notificationRecipient.pushNotificationToken,
			incrementUnreadCount: true,
			userId: notificationRecipient.id,
		},
	]);

	return reply.send({ message: "YAKKA updated successfully" });
};

export const cancelYakkaHandler = async (
	request: FastifyRequest<{ Params: YakkaParams }>,
	reply: FastifyReply
) => {
	const { yakkaId } = request.params;

	const yakka = await prisma.yakka.findFirst({
		where: {
			id: yakkaId,
			date: {
				gte: new Date(),
			},
			OR: [
				{
					organiserId: request.user.id,
				},
				{
					inviteeId: request.user.id,
				},
			],
		},
		select: {
			id: true,
			date: true,
			locationName: true,
			organiser: {
				select: {
					id: true,
					firstName: true,
					pushNotificationToken: true,
				},
			},
			invitee: {
				select: {
					id: true,
					firstName: true,
					pushNotificationToken: true,
				},
			},
		},
	});

	if (!yakka) {
		return reply.status(404).send({ message: "YAKKA not found" });
	}

	await prisma.yakka.delete({
		where: {
			id: yakka.id,
		},
	});

	//  Notify the other user

	const notificationRecipient =
		yakka.organiser.id === request.user.id ? yakka.invitee : yakka.organiser;
	const notificationSender =
		yakka.organiser.id === request.user.id ? yakka.organiser : yakka.invitee;
	const { clause, type } = notificationText.YAKKA_CANCELLED;
	await prisma.notification.create({
		data: {
			clause: `cancelled your YAKKA at ${yakka.locationName} on ${format(
				new Date(yakka.date),
				"do MMMM HH:mma"
			)}`,
			prepositionName: notificationSender.firstName || "Someone",
			type,
			// yakkaId: yakkaId,
			userId: notificationRecipient.id,
			senderId: request.user.id,
		},
	});

	await sendPushNotifications([
		{
			body: `${notificationSender.firstName || "Someone"} ${clause}`,
			data: {
				type,
				yakkaId,
			},
			pushToken: notificationRecipient.pushNotificationToken,
			incrementUnreadCount: true,
			userId: notificationRecipient.id,
		},
	]);

	return reply.send({ message: "YAKKA cancelled successfully" });
};
