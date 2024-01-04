import { FastifyReply, FastifyRequest } from "fastify";
import { LazyLoad } from "../../types/globalSchemas";
import { formatBasicUser } from "../../utils/dataFormatting";
import prisma from "../../utils/prisma";
import { basicProfileSelect } from "../yakka/yakka.service";
import { countUnreadNotifications } from "./notifications.helper";
import {
	NotificationParams,
	ReadNotificationInput,
} from "./notifications.schema";
export const getNotificationsHandler = async (
	request: FastifyRequest<{
		Querystring: LazyLoad;
	}>,
	reply: FastifyReply
) => {
	const { limit, page } = request.query;
	const notifications = await prisma.notification.findMany({
		where: {
			userId: request.user.id,
			// Don't bring back actioned notifications
			isActioned: false,
			// Don't bring back elapsed Yakka invites
			OR: [
				{
					yakka: null,
					group: null,
				},
				{
					group:{
						date: {
							gt: new Date()
						}
					},
					yakka: {
						date: {
							gt: new Date(),
						},
					},
				},
			],
		},
		include: {
			sender: {
				...basicProfileSelect,
			},
			review: {
				select: {
					id: true,
					rating: true,
					comment: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		skip: page * limit,
		take: limit,
	});

	console.log("CHECK NOTIFY 1", notifications)

	const unreadCount = await countUnreadNotifications(request.user.id);

	const hasNextPage = notifications.length === limit;

	const formattedNotifications = notifications.map(notification => {
		let fn = {
			...notification,
			timestamp: notification.createdAt.getTime(),
			sender: notification.sender
				? formatBasicUser(notification.sender)
				: undefined,
			yakkaId: notification.yakkaId || undefined,
			groupId: notification.groupId || undefined,
			friendRequestId: notification.friendRequestId || undefined,
			review: notification.review || undefined,
		};
		return fn;
	});

	console.log("FORMATED NOTIFY", formattedNotifications)

	return reply.send({
		notifications: formattedNotifications,
		nextPage: hasNextPage ? page + 1 : null,
		unreadCount,
	});
};

export const readNotificationHandler = async (
	request: FastifyRequest<{
		Body: ReadNotificationInput;
	}>,
	reply: FastifyReply
) => {
	const { notificationIds } = request.body;

	await prisma.notification.updateMany({
		where: {
			id: {
				in: notificationIds,
			},
			userId: request.user.id,
			isRead: false,
		},
		data: {
			isRead: true,
		},
	});

	const unreadCount = await countUnreadNotifications(request.user.id);

	return reply.send({
		unreadCount,
	});
};

export const deleteNotificationHandler = async (
	request: FastifyRequest<{
		Params: NotificationParams;
	}>,
	reply: FastifyReply
) => {
	const { notificationId } = request.params;

	const notification = await prisma.notification.findFirst({
		where: {
			id: notificationId,
			userId: request.user.id,
		},
	});

	if (!notification) {
		return reply.status(404).send({
			message: "Notification not found",
		});
	}

	await prisma.notification.delete({
		where: {
			id: notificationId,
		},
	});

	return reply.send({
		message: "Notification deleted",
	});
};
